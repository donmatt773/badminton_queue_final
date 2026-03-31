import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../configs/mongodb.js';
import Player from '../models/Player.model.js';

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const buildUniqueName = (baseName, usedNames) => {
  const trimmedBaseName = String(baseName || '').trim() || 'Player';
  let candidate = trimmedBaseName;
  let suffix = 2;

  while (usedNames.has(normalizeName(candidate))) {
    candidate = `${trimmedBaseName} (${suffix})`;
    suffix += 1;
  }

  return candidate;
};

const repairActivePlayerNames = async () => {
  await connectDB();

  await Player.updateMany(
    { isDeleted: { $exists: false } },
    { $set: { isDeleted: false, deletedAt: null } }
  );

  const activePlayers = await Player.find({ isDeleted: false })
    .sort({ createdAt: 1, _id: 1 });

  const groups = new Map();
  activePlayers.forEach((player) => {
    const key = normalizeName(player.name);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(player);
  });

  const usedNames = new Set(activePlayers.map((player) => normalizeName(player.name)));
  const renamedPlayers = [];

  for (const players of groups.values()) {
    if (players.length <= 1) continue;

    const [, ...duplicates] = players;
    for (const duplicate of duplicates) {
      const nextName = buildUniqueName(duplicate.name, usedNames);
      duplicate.name = nextName;
      await duplicate.save();
      usedNames.add(normalizeName(nextName));
      renamedPlayers.push({ id: duplicate._id.toString(), name: nextName });
    }
  }

  await Player.collection.createIndex(
    { name: 1 },
    {
      name: 'name_1',
      unique: true,
      partialFilterExpression: { isDeleted: false },
      collation: { locale: 'en', strength: 2 },
    }
  );

  const indexes = await mongoose.connection.db.collection('players').indexes();
  const hasUniqueNameIndex = indexes.some((index) => index.name === 'name_1' && index.unique === true);

  console.log(JSON.stringify({
    renamedCount: renamedPlayers.length,
    renamedPlayers,
    hasUniqueNameIndex,
  }, null, 2));
};

repairActivePlayerNames()
  .catch((error) => {
    console.error('Failed to repair active player names:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
