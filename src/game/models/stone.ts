export enum ElementType {
  Fire = 'Fire',
  Ice = 'Ice',
  Lightning = 'Lightning',
  Poison = 'Poison',
  Earth = 'Earth',
}

export interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: ElementType | null;
}

export function stoneMatchesChain(stone: Stone, openPip: number): boolean {
  return stone.leftPip === openPip || stone.rightPip === openPip;
}

export function stoneTotalPips(stone: Stone): number {
  return stone.leftPip + stone.rightPip;
}

export function createElementalStone(element: ElementType): Stone {
  const pips = [0, 1, 2, 3, 4, 5, 6];
  const left = pips[Math.floor(Math.random() * pips.length)];
  const right = pips[Math.floor(Math.random() * pips.length)];
  return { id: crypto.randomUUID(), leftPip: left, rightPip: right, element };
}
