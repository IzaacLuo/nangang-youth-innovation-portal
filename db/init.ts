import { ensureAuthReady } from './auth';

let initialization: Promise<void> | undefined;

export async function ensureTables() {
  if (!initialization) {
    initialization = ensureAuthReady();
  }
  await initialization;
}
