import { Stone } from './models/stone';

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
