import 'server-only';
import mongoose from 'mongoose';

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI');

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export async function dbConnect() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        const isAtlas = MONGODB_URI.startsWith('mongodb+srv://');
        cached.promise = mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 30000,
            maxPoolSize: 10,
            directConnection: !isAtlas,
            appName: 'my-app-next15'
        }).then(m => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
