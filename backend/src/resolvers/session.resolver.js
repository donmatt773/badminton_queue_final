import Court from '../models/Court.model.js';
import Game from '../models/Game.model.js';
import OngoingMatch from '../models/OngoingMatch.model.js';
import Payment from '../models/Payment.model.js';
import Player from '../models/Player.model.js';
import Session from '../models/Session.model.js';
import Settings from '../models/Settings.model.js';
import { pubsub } from '../configs/pubsub.js';

import { Types } from 'mongoose';

const toObjectId = (value) => new Types.ObjectId(value.toString());
const SESSION_SUB_TRIGGER = 'SESSION_UPDATED';
const PAYMENT_SUB_TRIGGER = 'PAYMENT_UPDATED';

const hasQueuedSessionUsingAnyCourt = async (sessionDoc) => {
  const query = {
    _id: { $ne: sessionDoc._id },
    status: 'QUEUED',
    courts: { $in: sessionDoc.courts },
  };

  return Session.exists(query);
};

const hasAnyMatchInSession = async (sessionId) => {
  return OngoingMatch.exists({ sessionId });
};

const closeSessionWithSnapshot = async (sessionId) => {
  try {
    const sessionDoc = await Session.findById(sessionId);

    if (!sessionDoc) {
      return { ok: false, message: 'Session not found', session: null };
    }

    if (sessionDoc.status !== 'OPEN' && sessionDoc.status !== 'CLOSED') {
      return {
        ok: false,
        message: 'Only open or closed sessions can be closed',
        session: null,
      };
    }

    const blockingQueuedSession = await hasQueuedSessionUsingAnyCourt(sessionDoc);
    if (blockingQueuedSession) {
      return {
        ok: false,
        message: 'Cannot close session while a queued session uses the same court(s)',
        session: null,
      };
    }

    const hasMatches = await hasAnyMatchInSession(sessionDoc._id);
    if (hasMatches) {
      return {
        ok: false,
        message: 'Cannot end session while matches are ongoing or queued',
        session: null,
      };
    }

    if (sessionDoc.status === 'CLOSED') {
      return { ok: true, message: 'Session already closed', session: sessionDoc };
    }

    let settings = await Settings.findOne({ scope: 'GLOBAL' });
    if (!settings) {
      settings = await Settings.create({ scope: 'GLOBAL', pricePerGame: 0 });
    }

    const pricePerGame = sessionDoc.price ?? settings.pricePerGame;

    // Build billing snapshot from completed games so finished/removed players are still billed correctly.
    const gamePlayerCounts = await Game.aggregate([
      { $match: { sessionId: sessionDoc._id } },
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players',
          gamesPlayed: { $sum: 1 },
        },
      },
    ]);

    const playersBreakdown = gamePlayerCounts.map((item) => ({
      playerId: item._id,
      gamesPlayed: Number(item.gamesPlayed || 0),
      total: Number(item.gamesPlayed || 0) * pricePerGame,
      // PENDING = session ended but no explicit checkout was done for this player.
      status: 'PENDING',
      checkedOutAt: null,
    }));

    const existingPayment = await Payment.findOne({ sessionId: sessionDoc._id });
    if (existingPayment) {
      // A player is truly "explicitly checked out" only if:
      //   1. Their payment status is PAID or UNPAID (written by removePlayerFromSessions), AND
      //   2. They are NO LONGER in session.players (removePlayerFromSessions removes them).
      // Any PAID/UNPAID entry for a player still in session.players is stale data from a
      // previous (buggy) session close and must NOT be treated as a real checkout.
      const currentSessionPlayerIds = new Set(
        (sessionDoc.players || []).map((p) => p.playerId.toString())
      );

      const explicitlyCheckedOutIds = new Set(
        (existingPayment.players || [])
          .filter((entry) => {
            const key = entry.playerId.toString();
            return (
              (entry.status === 'PAID' || entry.status === 'UNPAID') &&
              !currentSessionPlayerIds.has(key)
            );
          })
          .map((entry) => entry.playerId.toString())
      );

      // Build a fresh lookup from the game aggregate.
      const aggregateByPlayerId = new Map(
        playersBreakdown.map((entry) => [entry.playerId.toString(), entry])
      );

      const mergedById = new Map();

      (existingPayment.players || []).forEach((entry) => {
        const key = entry.playerId.toString();
        if (explicitlyCheckedOutIds.has(key)) {
          // Real checkout — preserve their gamesPlayed, total, and PAID/UNPAID status verbatim.
          mergedById.set(key, {
            playerId: entry.playerId,
            gamesPlayed: Number(entry.gamesPlayed || 0),
            total: Number(entry.total || 0),
            status: entry.status,
            checkedOutAt: entry.checkedOutAt || null,
          });
        } else {
          // Stale or still-in-session entry — use fresh game aggregate data and reset to PENDING.
          // If they have no aggregate data (0 games, no explicit checkout), omit them entirely.
          const fresh = aggregateByPlayerId.get(key);
          if (fresh) {
            mergedById.set(key, { ...fresh, status: 'PENDING' });
          }
        }
      });

      // Add players from the game aggregate not yet in the map.
      playersBreakdown.forEach((entry) => {
        const key = entry.playerId.toString();
        if (!mergedById.has(key)) {
          mergedById.set(key, entry); // entry already has status: 'PENDING'
        }
      });

      const mergedPlayers = Array.from(mergedById.values());
      const newTotalRevenue = mergedPlayers.reduce((sum, entry) => sum + Number(entry.total || 0), 0);

      const updatedPaymentDoc = await Payment.findByIdAndUpdate(
        existingPayment._id,
        { $set: { players: mergedPlayers, totalRevenue: newTotalRevenue } },
        { new: true, runValidators: true }
      );

      sessionDoc.status = 'CLOSED';
      sessionDoc.endedAt = sessionDoc.endedAt ?? new Date();
      await sessionDoc.save();

      pubsub.publish(SESSION_SUB_TRIGGER, {
        sessionSub: { type: 'CLOSED', session: sessionDoc },
      });

      if (updatedPaymentDoc) {
        pubsub.publish(PAYMENT_SUB_TRIGGER, {
          paymentSub: { type: 'UPDATED', payment: updatedPaymentDoc },
        });
      }

      return { ok: true, message: 'Session closed successfully', session: sessionDoc };
    }

    const totalRevenue = playersBreakdown.reduce((sum, item) => sum + item.total, 0);

    const paymentDoc = await Payment.create({
      sessionId: sessionDoc._id,
      pricePerGame,
      players: playersBreakdown,
      totalRevenue,
      closedAt: new Date(),
    });

    sessionDoc.status = 'CLOSED';
    sessionDoc.endedAt = new Date();
    await sessionDoc.save();

    pubsub.publish(SESSION_SUB_TRIGGER, {
      sessionSub: { type: 'CLOSED', session: sessionDoc },
    });

    if (paymentDoc) {
      pubsub.publish(PAYMENT_SUB_TRIGGER, {
        paymentSub: { type: 'CREATED', payment: paymentDoc },
      });
    }

    return { ok: true, message: 'Session closed successfully', session: sessionDoc };
  } catch (error) {
    return { ok: false, message: error.message, session: null };
  }
};

const sessionResolver = {
  Query: {
    sessions: async () => Session.find({ isArchived: false }).sort({ createdAt: -1 }),
    closedSessions: async () => Session.find({ status: 'CLOSED', isArchived: false }).sort({ createdAt: -1 }),
    session: async (_, { id }) => Session.findById(id),
  },

  Session: {
    courtsDetails: async (session) => {
      if (!session?.courts?.length) return [];
      return Court.find({ _id: { $in: session.courts } }).sort({ name: 1 });
    },
    isArchived: (session) => Boolean(session.isArchived),
    createdAt: (session) => (session?.createdAt ? new Date(session.createdAt).toISOString() : null),
    updatedAt: (session) => (session?.updatedAt ? new Date(session.updatedAt).toISOString() : null),
    startedAt: (session) => (session?.startedAt ? new Date(session.startedAt).toISOString() : null),
    endedAt: (session) => (session?.endedAt ? new Date(session.endedAt).toISOString() : null),
  },

  Mutation: {
    createSession: async (_, { input }) => {
      try {
        const uniqueCourtIds = [...new Set(input.courtIds.map((id) => id.toString()))];
        const uniquePlayerIds = [...new Set(input.playerIds.map((id) => id.toString()))];

        const courtsCount = await Court.countDocuments({ _id: { $in: uniqueCourtIds } });
        if (courtsCount !== uniqueCourtIds.length) {
          return { ok: false, message: 'One or more courts do not exist', session: null };
        }

        const playersCount = await Player.countDocuments({ _id: { $in: uniquePlayerIds } });
        if (playersCount !== uniquePlayerIds.length) {
          return { ok: false, message: 'One or more players do not exist', session: null };
        }

        const sessionDoc = await Session.create({
          name: input.name,
          status: 'QUEUED',
          courts: uniqueCourtIds.map(toObjectId),
          players: uniquePlayerIds.map((playerId) => ({
            playerId: toObjectId(playerId),
            gamesPlayed: 0,
          })),
          price: input.price !== undefined ? input.price : null,
        });

        pubsub.publish(SESSION_SUB_TRIGGER, {
          sessionSub: { type: 'CREATED', session: sessionDoc },
        });

        return { ok: true, message: 'Session created successfully', session: sessionDoc };
      } catch (error) {
        return { ok: false, message: error.message, session: null };
      }
    },

    updateSession: async (_, { id, input }) => {
      try {
        const sessionDoc = await Session.findById(id);

        if (!sessionDoc) {
          return { ok: false, message: 'Session not found', session: null };
        }

        if (input.name !== undefined) {
          sessionDoc.name = input.name;
        }

        if (input.price !== undefined) {
          sessionDoc.price = input.price;
        }

        if (input.courtIds !== undefined) {
          const uniqueCourtIds = [...new Set(input.courtIds.map((id) => id.toString()))];
          const courtsCount = await Court.countDocuments({ _id: { $in: uniqueCourtIds } });
          if (courtsCount !== uniqueCourtIds.length) {
            return { ok: false, message: 'One or more courts do not exist', session: null };
          }
          sessionDoc.courts = uniqueCourtIds.map(toObjectId);
        }

        if (input.playerIds !== undefined) {
          const uniquePlayerIds = [...new Set(input.playerIds.map((id) => id.toString()))];
          const playersCount = await Player.countDocuments({ _id: { $in: uniquePlayerIds } });
          if (playersCount !== uniquePlayerIds.length) {
            return { ok: false, message: 'One or more players do not exist', session: null };
          }

          const existingPlayerIds = sessionDoc.players.map((item) => item.playerId.toString());
          const removedPlayerIds = existingPlayerIds.filter(
            (playerId) => !uniquePlayerIds.includes(playerId)
          );

          if (removedPlayerIds.length > 0) {
            const blockingMatches = await OngoingMatch.find({
              sessionId: sessionDoc._id,
              playerIds: { $in: removedPlayerIds.map(toObjectId) },
            }).select('playerIds');

            if (blockingMatches.length > 0) {
              const blockedPlayerIdSet = new Set(
                blockingMatches
                  .flatMap((match) => match.playerIds || [])
                  .map((playerId) => playerId.toString())
                  .filter((playerId) => removedPlayerIds.includes(playerId))
              );

              const blockedPlayers = await Player.find({
                _id: { $in: [...blockedPlayerIdSet].map(toObjectId) },
              }).select('name').sort({ name: 1 });

              const blockedNames = blockedPlayers
                .map((player) => player.name)
                .filter(Boolean);

              const blockedNamesSuffix = blockedNames.length > 0
                ? `: ${blockedNames.join(', ')}`
                : '';

              return {
                ok: false,
                message: `Cannot remove players who are in queued or ongoing matches${blockedNamesSuffix}`,
                session: null,
              };
            }
          }

          const existingGamesByPlayerId = new Map(
            (sessionDoc.players || []).map((item) => [
              item.playerId.toString(),
              Number(item.gamesPlayed || 0),
            ])
          );

          sessionDoc.players = uniquePlayerIds.map((playerId) => ({
            playerId: toObjectId(playerId),
            gamesPlayed: existingGamesByPlayerId.get(playerId) || 0,
          }));
        }

        await sessionDoc.save();

        pubsub.publish(SESSION_SUB_TRIGGER, {
          sessionSub: { type: 'UPDATED', session: sessionDoc },
        });

        return { ok: true, message: 'Session updated successfully', session: sessionDoc };
      } catch (error) {
        return { ok: false, message: error.message, session: null };
      }
    },

    deleteSession: async (_, { id }) => {
      try {
        const sessionDoc = await Session.findById(id);

        if (!sessionDoc) {
          return { ok: true, message: 'Session already deleted', session: null };
        }

        if (!sessionDoc.isArchived) {
          sessionDoc.isArchived = true;
          await sessionDoc.save();
        }

        pubsub.publish(SESSION_SUB_TRIGGER, {
          sessionSub: { type: 'ARCHIVED', session: sessionDoc },
        });

        return { ok: true, message: 'Session archived successfully', session: null };
      } catch (error) {
        return { ok: false, message: error.message, session: null };
      }
    },

    startSession: async (_, { id }) => {
      try {
        const sessionDoc = await Session.findById(id);

        if (!sessionDoc) {
          return { ok: false, message: 'Session not found', session: null };
        }

        if (sessionDoc.status !== 'QUEUED') {
          return {
            ok: false,
            message: 'Only queued sessions can be started',
            session: null,
          };
        }

        sessionDoc.status = 'OPEN';
        sessionDoc.startedAt = sessionDoc.startedAt ?? new Date();
        await sessionDoc.save();

        pubsub.publish(SESSION_SUB_TRIGGER, {
          sessionSub: { type: 'UPDATED', session: sessionDoc },
        });

        return { ok: true, message: 'Session started successfully', session: sessionDoc };
      } catch (error) {
        return { ok: false, message: error.message, session: null };
      }
    },

    addPlayersToSession: async (_, { id, input }) => {
      try {
        const sessionDoc = await Session.findById(id);

        if (!sessionDoc) {
          return { ok: false, message: 'Session not found', session: null };
        }

        if (sessionDoc.status === 'CLOSED') {
          return { ok: false, message: 'Cannot add players to a closed session', session: null };
        }

        const existingIds = new Set(sessionDoc.players.map((item) => item.playerId.toString()));
        const incomingIds = [...new Set(input.playerIds.map((playerId) => playerId.toString()))];

        const newPlayerIds = incomingIds.filter((playerId) => !existingIds.has(playerId));

        if (newPlayerIds.length === 0) {
          return { ok: true, message: 'No new players to add', session: sessionDoc };
        }

        const count = await Player.countDocuments({ _id: { $in: newPlayerIds } });
        if (count !== newPlayerIds.length) {
          return { ok: false, message: 'One or more players do not exist', session: null };
        }

        sessionDoc.players.push(
          ...newPlayerIds.map((playerId) => ({ playerId: toObjectId(playerId), gamesPlayed: 0 }))
        );

        await sessionDoc.save();

        pubsub.publish(SESSION_SUB_TRIGGER, {
          sessionSub: { type: 'UPDATED', session: sessionDoc },
        });

        return { ok: true, message: 'Players added to session successfully', session: sessionDoc };
      } catch (error) {
        return { ok: false, message: error.message, session: null };
      }
    },

    endSession: async (_, { id }) => {
      try {
        const sessionDoc = await Session.findById(id);

        if (!sessionDoc) {
          return { ok: false, message: 'Session not found', session: null };
        }

        if (sessionDoc.status !== 'OPEN') {
          return {
            ok: false,
            message: 'Only open sessions can be ended',
            session: null,
          };
        }

        const hasMatches = await hasAnyMatchInSession(sessionDoc._id);
        if (hasMatches) {
          return {
            ok: false,
            message: 'Cannot end session while matches are ongoing or queued',
            session: null,
          };
        }

        const blockingQueuedSession = await hasQueuedSessionUsingAnyCourt(sessionDoc);

        if (blockingQueuedSession) {
          sessionDoc.status = 'CLOSED';
          await sessionDoc.save();

          pubsub.publish(SESSION_SUB_TRIGGER, {
            sessionSub: { type: 'UPDATED', session: sessionDoc },
          });

          return {
            ok: true,
            message: 'Session moved to closed state',
            session: sessionDoc,
          };
        }

        return closeSessionWithSnapshot(id);
      } catch (error) {
        return { ok: false, message: error.message, session: null };
      }
    },

    closeSession: async (_, { id }) => closeSessionWithSnapshot(id),

    archiveSession: async (_, { id }) => {
      try {
        const sessionDoc = await Session.findById(id)

        if (!sessionDoc) {
          return { ok: false, message: 'Session not found', session: null }
        }

        if (sessionDoc.isArchived) {
          return { ok: true, message: 'Session already archived', session: sessionDoc }
        }

        sessionDoc.isArchived = true
        await sessionDoc.save()

        pubsub.publish(SESSION_SUB_TRIGGER, {
          sessionSub: { type: 'ARCHIVED', session: sessionDoc },
        })

        return { ok: true, message: 'Session archived successfully', session: sessionDoc }
      } catch (error) {
        return { ok: false, message: error.message, session: null }
      }
    },

    removePlayerFromSessions: async (_, { playerId, sessionIds, isExempted = false }) => {
      try {
        const sessions = await Session.find({ _id: { $in: sessionIds } })

        if (!sessions || sessions.length === 0) {
          return { ok: false, message: 'Sessions not found', sessions: [] }
        }

        // Remove player from each session
        for (const session of sessions) {
          const existingSessionPlayer = (session.players || []).find(
            (p) => p.playerId.toString() === playerId.toString()
          )
          const gamesPlayed = Number(existingSessionPlayer?.gamesPlayed || 0)
          const pricePerGame = Number(session.price || 0)
          const status = isExempted ? 'UNPAID' : 'PAID'
          const total = isExempted ? 0 : gamesPlayed * pricePerGame

          let paymentDoc = await Payment.findOne({ sessionId: session._id })
          if (!paymentDoc) {
            paymentDoc = await Payment.create({
              sessionId: session._id,
              pricePerGame,
              players: [
                {
                  playerId: toObjectId(playerId),
                  gamesPlayed,
                  total,
                  status,
                  checkedOutAt: new Date(),
                },
              ],
              totalRevenue: total,
              closedAt: new Date(),
            })
          } else {
            const entries = [...(paymentDoc.players || [])]
            const existingIndex = entries.findIndex(
              (entry) => entry.playerId.toString() === playerId.toString()
            )

            const nextEntry = {
              playerId: toObjectId(playerId),
              gamesPlayed,
              total,
              status,
              checkedOutAt: new Date(),
            }

            if (existingIndex >= 0) {
              entries[existingIndex] = nextEntry
            } else {
              entries.push(nextEntry)
            }

            const newPaymentRevenue = entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0)
            await Payment.findByIdAndUpdate(
              paymentDoc._id,
              { $set: { players: entries, totalRevenue: newPaymentRevenue } },
              { runValidators: true }
            )
          }

          session.players = session.players.filter(
            p => p.playerId.toString() !== playerId.toString()
          )
          await session.save()

          pubsub.publish(SESSION_SUB_TRIGGER, {
            sessionSub: { type: 'UPDATED', session },
          })
        }

        return { ok: true, message: 'Player removed from sessions', sessions }
      } catch (error) {
        return { ok: false, message: error.message, sessions: [] }
      }
    },
  },
  Subscription: {
    sessionSub: {
      subscribe: () => pubsub.asyncIterableIterator(SESSION_SUB_TRIGGER),
    },
  },
};

export default sessionResolver;
