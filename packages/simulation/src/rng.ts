/**
 * Seeded pseudo-random number generator (mulberry32).
 * Ensures reproducible simulation results given the same seed.
 */

/**
 * Create a seeded random number generator.
 * Uses the mulberry32 algorithm for fast, deterministic output.
 *
 * @param seed - Integer seed value
 * @returns Function that returns a random number in [0, 1)
 */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random number in a range using a seeded RNG
 */
export function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/**
 * Generate a random integer in a range (inclusive) using a seeded RNG
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randomInRange(rng, min, max + 1));
}
