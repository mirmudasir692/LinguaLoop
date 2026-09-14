import { redisService } from '../../../services/redis.service';
import { getMongoStore } from '.';

const redis = redisService.getClient();

const CACHE_TTL = 3600;

export function getCachedMongoStore() {
  const baseStore = getMongoStore();

  return new Proxy(baseStore, {
    get(target, prop: string, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      if (typeof originalMethod !== 'function') return originalMethod;

      if (prop === 'getThread') {
        return async (threadId: string) => {
          const cacheKey = `mastra:thread:${threadId}`;
          const cached = await redis.get(cacheKey);
          if (cached) return JSON.parse(cached);

          const result = await originalMethod.call(target, threadId);
          if (result) {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
          }
          return result;
        };
      }

      if (prop === 'getMessages') {
        return async (threadId: string, ...args: unknown[]) => {
          const cacheKey = `mastra:messages:${threadId}`;
          const cached = await redis.get(cacheKey);
          if (cached) return JSON.parse(cached);

          const result = await originalMethod.call(target, threadId, ...args);
          if (result) {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
          }
          return result;
        };
      }

      if (prop === 'getThreadsByResourceId') {
        return async (resourceId: string, ...args: unknown[]) => {
          const cacheKey = `mastra:threads:resource:${resourceId}`;
          const cached = await redis.get(cacheKey);
          if (cached) return JSON.parse(cached);

          const result = await originalMethod.call(target, resourceId, ...args);
          if (result) {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
          }
          return result;
        };
      }

      const writeMethods = [
        'saveThread',
        'updateThread',
        'deleteThread',
        'saveMessages',
        'deleteMessages',
        'getWorkingMemory',
        'saveWorkingMemory',
      ];

      if (writeMethods.includes(prop)) {
        return async (...args: unknown[]) => {
          const result = await originalMethod.apply(target, args);
          const firstArg = args[0] as Record<string, unknown> | undefined;

          let threadId =
            (firstArg?.threadId as string | undefined) ||
            (firstArg?.id as string | undefined) ||
            ((firstArg as unknown as Record<string, unknown>[])?.[0]?.threadId as
              string | undefined) ||
            (firstArg?.resourceId as string | undefined);

          if (threadId) {
            await redis.del(`mastra:thread:${threadId}`);
            await redis.del(`mastra:messages:${threadId}`);
            await redis.del(`mastra:working_memory:${threadId}`);
          }

          if (firstArg?.resourceId) {
            await redis.del(`mastra:threads:resource:${firstArg.resourceId as string}`);
          }

          return result;
        };
      }

      return originalMethod.bind(target);
    },
  });
}

export { redis };
