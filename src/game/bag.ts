import { Stone, ElementType } from './models/stone';
import type { EnemyBagConfig } from './ai/enemy-templates';

const STARTING_POOLS: Array<[number, number][]> = [
  [[0, 5], [1, 4], [2, 3]],          // sum 5 — 25%
  [[0, 6], [1, 5], [2, 4], [3, 3]],  // sum 6 — 50%
  [[1, 6], [2, 5], [3, 4]],          // sum 7 — 25%
];
const STARTING_WEIGHTS = [0.25, 0.50, 0.25];
const ALL_ELEMENTS = Object.values(ElementType) as ElementType[];

// Build all valid (left, right) stone combos where left <= right
function buildFullPool(): [number, number][] {
  const pool: [number, number][] = [];
  for (let left = 0; left <= 6; left++) {
    for (let right = left; right <= 6; right++) {
      pool.push([left, right]);
    }
  }
  return pool;
}

const FULL_POOL = buildFullPool();

export function generateEnemyBag(config: EnemyBagConfig, count: number): Stone[] {
  const [minSum, maxSum] = config.pipSumRange;
  const characteristicPool = FULL_POOL.filter(([l, r]) => {
    const sum = l + r;
    return sum >= minSum && sum <= maxSum;
  });
  // Fall back to full pool if characteristic pool is empty
  const charPool = characteristicPool.length > 0 ? characteristicPool : FULL_POOL;

  const stones: Stone[] = [];
  for (let i = 0; i < count; i++) {
    const useCharacteristic = Math.random() < 0.9;
    const pool = useCharacteristic ? charPool : FULL_POOL;
    const [left, right] = pool[Math.floor(Math.random() * pool.length)];
    stones.push({ id: crypto.randomUUID(), leftPip: left, rightPip: right, element: null });
  }

  // Assign elemental stones at random unique indices
  if (config.elements.length > 0) {
    const elementalCount = Math.floor(count * config.elementalDensity);
    const indices = Array.from({ length: count }, (_, i) => i);
    // Fisher-Yates partial shuffle to pick elementalCount unique indices
    for (let i = 0; i < elementalCount; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < elementalCount; i++) {
      const element = config.elements[Math.floor(Math.random() * config.elements.length)];
      stones[indices[i]] = { ...stones[indices[i]], element };
    }
  }

  return stones;
}

export class Bag {
  public stones: Stone[];

  constructor(stones?: Stone[]) {
    this.stones = stones !== undefined ? stones : this.generateFullSet();
  }

  generateFullSet(): Stone[] {
    const stones: Stone[] = [];
    for (let left = 0; left <= 6; left++) {
      for (let right = left; right <= 6; right++) {
        stones.push({
          id: `stone-${left}-${right}-${Date.now()}-${Math.random()}`,
          leftPip: left,
          rightPip: right,
          element: null,
        });
      }
    }
    return stones;
  }

  generateStartingBag(count: number): Stone[] {
    const stones: Stone[] = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let groupIndex = 0;
      let cumulative = 0;
      for (let g = 0; g < STARTING_WEIGHTS.length; g++) {
        cumulative += STARTING_WEIGHTS[g];
        if (roll < cumulative) { groupIndex = g; break; }
      }
      const pool = STARTING_POOLS[groupIndex];
      const [left, right] = pool[Math.floor(Math.random() * pool.length)];
      stones.push({ id: crypto.randomUUID(), leftPip: left, rightPip: right, element: null });
    }
    const elementalIndex = Math.floor(Math.random() * count);
    const element = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
    stones[elementalIndex] = { ...stones[elementalIndex], element };
    return stones;
  }

  shuffle(): void {
    const arr = this.stones;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  draw(count: number): Stone[] {
    const actual = Math.min(count, this.stones.length);
    return this.stones.splice(0, actual);
  }

  addStone(stone: Stone): void {
    this.stones.push(stone);
  }

  get size(): number {
    return this.stones.length;
  }

  toJSON(): object {
    return { stones: this.stones };
  }

  static fromJSON(data: any): Bag {
    return new Bag(data.stones as Stone[]);
  }
}
