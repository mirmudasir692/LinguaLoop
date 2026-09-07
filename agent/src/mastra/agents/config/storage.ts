export interface MongoStorageConfig {
  uri: string;
  dbName: string;
}

export function getMongoStorageConfig(): MongoStorageConfig {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'mastra_db';

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  return {
    uri,
    dbName,
  };
}