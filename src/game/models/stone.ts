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
