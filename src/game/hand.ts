import { Stone } from './models/stone';
import { Bag } from './bag';

export class Hand {
  public static readonly MAX_SIZE = 7;
  public stones: Stone[];

  constructor(stones?: Stone[]) {
    this.stones = stones !== undefined ? [...stones] : [];
  }

  drawFromBag(bag: Bag, count: number): Stone[] {
    const available = Hand.MAX_SIZE - this.stones.length;
    const toDraw = Math.min(count, available);
    if (toDraw <= 0) return [];
    const drawn = bag.draw(toDraw);
    this.stones.push(...drawn);
    return drawn;
  }

  playStone(stoneId: string): Stone {
    const index = this.stones.findIndex((s) => s.id === stoneId);
    if (index === -1) {
      throw new Error(`Stone with id "${stoneId}" not found in hand`);
    }
    const [stone] = this.stones.splice(index, 1);
    return stone;
  }

  get size(): number {
    return this.stones.length;
  }

  toJSON(): object {
    return { stones: this.stones };
  }

  static fromJSON(data: any): Hand {
    return new Hand(data.stones as Stone[]);
  }
}
