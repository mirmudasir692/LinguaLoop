import { DuckDBStore } from '@mastra/duckdb';

export async function getObservabilityStore() {
  const duckDbStore = new DuckDBStore();

  return duckDbStore.getStore('observability');
}