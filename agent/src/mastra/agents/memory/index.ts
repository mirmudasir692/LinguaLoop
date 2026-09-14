import { Memory } from '@mastra/memory';
import model from '../../utils/config';
import { getMongoStore } from '../storage';

export function createAgentMemory() {
  const store = getMongoStore();

  return new Memory({
    storage: store,
    options: {
      generateTitle: true,
      lastMessages: 10,
      semanticRecall: false,
      workingMemory: {
        enabled: true,
        template: `
          CURRENT DATE: {{currentDate}}
          
          RELEVANT MEMORIES ABOUT USER:
          {{memory}}
        `,
      },
      observationalMemory: {
        model,
      },
    },
  });
}
