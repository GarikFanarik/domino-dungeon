export interface HasHP {
  hp: {
    current: number;
    max: number;
  };
}

export interface DamageResult {
  damageTaken: number;
  overkill: number;
}

export function dealDamage(target: HasHP, amount: number): DamageResult {
  const damageTaken = Math.min(target.hp.current, amount);
  const overkill = Math.max(0, amount - target.hp.current);
  target.hp.current = Math.max(0, target.hp.current - amount);
  return { damageTaken, overkill };
}

export function heal(target: HasHP, amount: number): number {
  const space = target.hp.max - target.hp.current;
  const healed = Math.min(space, amount);
  target.hp.current += healed;
  return healed;
}

export function isDead(target: HasHP): boolean {
  return target.hp.current <= 0;
}
