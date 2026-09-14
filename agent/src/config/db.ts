import mongoose from 'mongoose';
import env from './env.config';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
    });
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`MongoDB connection error: ${err.message}`);
    throw error;
  }
};
