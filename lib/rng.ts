export type RandomSource = () => number;

/**
 * Deterministic PRNG (mulberry32) so game-logic tests and demo seed data
 * don't depend on Math.random.
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
