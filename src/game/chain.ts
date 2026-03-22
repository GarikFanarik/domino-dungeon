import { Stone } from './models/stone';

export interface PlacedStone {
  stone: Stone;
  side: 'left' | 'right';
  flipped: boolean; // if true, stone is played right-to-left
}

export class Chain {
  stones: PlacedStone[] = [];
  leftOpen: number | null = null;
  rightOpen: number | null = null;

  // Returns whether stone can be placed on the right end (the only playable end).
  // An empty chain always accepts any stone.
  canPlay(stone: Stone): { left: boolean; right: boolean } {
    if (this.stones.length === 0) {
      return { left: false, right: true };
    }

    const right =
      this.rightOpen !== null &&
      (stone.leftPip === this.rightOpen || stone.rightPip === this.rightOpen);

    return { left: false, right };
  }

  // Places stone onto the chain.
  // If chain is empty, stone starts the chain and both ends are set.
  // flipped: if false, stone's leftPip connects to the chain end;
  //          if true,  stone's rightPip connects to the chain end.
  playStone(stone: Stone, side: 'left' | 'right', flipped: boolean): void {
    if (this.stones.length === 0) {
      // First stone — set both open ends based on orientation.
      if (!flipped) {
        this.leftOpen = stone.leftPip;
        this.rightOpen = stone.rightPip;
      } else {
        this.leftOpen = stone.rightPip;
        this.rightOpen = stone.leftPip;
      }
      this.stones.push({ stone, side, flipped });
      return;
    }

    if (side === 'left') {
      // The pip that connects to leftOpen; new leftOpen is the other pip.
      if (!flipped) {
        // leftPip connects → new leftOpen = rightPip
        this.leftOpen = stone.rightPip;
      } else {
        // rightPip connects → new leftOpen = leftPip
        this.leftOpen = stone.leftPip;
      }
    } else {
      // side === 'right'
      if (!flipped) {
        // leftPip connects → new rightOpen = rightPip
        this.rightOpen = stone.rightPip;
      } else {
        // rightPip connects → new rightOpen = leftPip
        this.rightOpen = stone.leftPip;
      }
    }

    this.stones.push({ stone, side, flipped });
  }

  get length(): number {
    return this.stones.length;
  }

  toJSON(): object {
    return {
      stones: this.stones,
      leftOpen: this.leftOpen,
      rightOpen: this.rightOpen,
    };
  }

  static fromJSON(data: any): Chain {
    const chain = new Chain();
    chain.stones = data.stones as PlacedStone[];
    chain.leftOpen = data.leftOpen;
    chain.rightOpen = data.rightOpen;
    return chain;
  }
}
