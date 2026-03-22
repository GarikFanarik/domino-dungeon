export interface PlayerState {
  hp: { current: number; max: number };
  armor: number;
  armorFortified: boolean;
  gold: number;
  relics: string[];
}

export function defaultPlayerState(): PlayerState {
  return { hp: { current: 80, max: 80 }, armor: 0, armorFortified: false, gold: 0, relics: [] };
}
