import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../configs/mongodb.js';
import Game from '../models/Game.model.js';
import Session from '../models/Session.model.js';

const buildSessionPlayerCounts = async () => {
  const counts = await Game.aggregate([
    { $unwind: '$players' },
    {
      $group: {
        _id: {
          sessionId: '$sessionId',
          playerId: '$players',
        },
        gamesPlayed: { $sum: 1 },
      },
    },
  ]);

  const countsBySession = new Map();

  counts.forEach((item) => {
    const sessionId = item?._id?.sessionId?.toString();
    const playerId = item?._id?.playerId?.toString();

    if (!sessionId || !playerId) return;

    if (!countsBySession.has(sessionId)) {
      countsBySession.set(sessionId, new Map());
    }

    countsBySession.get(sessionId).set(playerId, Number(item.gamesPlayed || 0));
  });

  return countsBySession;
};

const recomputeSessionGamesPlayed = async () => {
  await connectDB();

  const countsBySession = await buildSessionPlayerCounts();
  const sessions = await Session.find({});

  let touchedSessions = 0;
  let touchedPlayers = 0;

  for (const session of sessions) {
    const playerCounts = countsBySession.get(session._id.toString()) || new Map();
    let hasChanges = false;

    session.players = (session.players || []).map((sessionPlayer) => {
      const playerId = sessionPlayer?.playerId?.toString();
      const nextGamesPlayed = Math.max(0, Number(playerCounts.get(playerId) || 0));
      const currentGamesPlayed = Math.max(0, Number(sessionPlayer?.gamesPlayed || 0));

      if (nextGamesPlayed !== currentGamesPlayed) {
        hasChanges = true;
        touchedPlayers += 1;
      }

      return {
        playerId: sessionPlayer.playerId,
        gamesPlayed: nextGamesPlayed,
      };
    });

    if (hasChanges) {
      await session.save();
      touchedSessions += 1;
    }
  }

  //console.log(`Recompute complete. Updated ${touchedPlayers} player entries across ${touchedSessions} sessions.`);
};

recomputeSessionGamesPlayed()
  .catch((error) => {
    console.error('Failed to recompute gamesPlayed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
