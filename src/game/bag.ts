import { Stone, ElementType } from './models/stone';

const STARTING_POOLS: Array<[number, number][]> = [
  [[0, 5], [1, 4], [2, 3]],          // sum 5 — 25%
  [[0, 6], [1, 5], [2, 4], [3, 3]],  // sum 6 — 50%
  [[1, 6], [2, 5], [3, 4]],          // sum 7 — 25%
];
const STARTING_WEIGHTS = [0.25, 0.50, 0.25];
const ALL_ELEMENTS = Object.values(ElementType) as ElementType[];

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
