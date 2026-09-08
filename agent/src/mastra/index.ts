import { Mastra } from '@mastra/core/mastra';
import {
  MastraStorageExporter,
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { agent } from './agents/agent';
import {  getMongoVectorStore } from './agents/storage';
import { getCachedMongoStore } from './agents/storage/redis';

export const mastra = new Mastra({
  agents: { agent },
  
  storage: getCachedMongoStore(),
  
  vectors: {
    default: getMongoVectorStore(),
  },

  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra-mongo-app',
        exporters: [new MastraStorageExporter(), new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});