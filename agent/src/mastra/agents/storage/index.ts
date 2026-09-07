import { MongoDBStore, MongoDBVector } from '@mastra/mongodb';

import { getMongoStorageConfig } from '../config/storage';

let mongoStore: MongoDBStore | null = null;
let mongoVector: MongoDBVector | null = null; 

export function getMongoStore(): MongoDBStore {
  if (mongoStore) {
    return mongoStore;
  }

  const { uri, dbName } = getMongoStorageConfig();

  mongoStore = new MongoDBStore({
    id: 'mastra-mongodb',
    url: uri,
    dbName,
  });

  return mongoStore;
}

export function getMongoVectorStore(): MongoDBVector {
  if (mongoVector) {
    return mongoVector;
  }

  const { uri, dbName } = getMongoStorageConfig();

  mongoVector = new MongoDBVector({
    id: 'mastra-vector',
    uri,
    dbName,
  });

  return mongoVector;
}