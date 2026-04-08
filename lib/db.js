import mongoose from 'mongoose';
import { setServers } from "node:dns/promises"
setServers(["1.1.1.1", "8.8.8.8"]) 


const MONGODB_URI = process.env.MONGODB_URI;

// Cache the connection across hot-reloads in development
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined. Please set it in your environment variables.');
  }
  
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
