/** Time-sortable unique id. */
export const newId = (): string => Bun.randomUUIDv7();

export const nowIso = (now: Date = new Date()): string => now.toISOString();
