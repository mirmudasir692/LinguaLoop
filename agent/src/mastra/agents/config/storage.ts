import env from '../../../config/env.config';

export interface MongoStorageConfig {
  uri: string;
  dbName: string;
}

export function getMongoStorageConfig(): MongoStorageConfig {
  return {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
  };
}
