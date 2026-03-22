import seedrandom from 'seedrandom';
import { Enemy, EnemyStatus } from '../models/enemy';

export enum EnemyTemplateType {
  Normal = 'Normal',
  Elite = 'Elite',
  Boss = 'Boss',
}

export interface EnemyTemplate {
  act: number;
  type: EnemyTemplateType;
  name: string;
}

export interface BossEnemy extends Enemy {
  phase2Threshold: number;
}

const HP_RANGES: Record<number, [number, number]> = {
  1: [20, 40],
  2: [40, 70],
  3: [60, 100],
};

function defaultStatus(): EnemyStatus {
  return { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 };
}

export function scaleEnemy(template: EnemyTemplate, act: number, seed: string): Enemy {
  const rng = seedrandom(seed);
  const [min, max] = HP_RANGES[act] ?? [20, 40];
  let baseHp = Math.floor(rng() * (max - min + 1)) + min;

  if (template.type === EnemyTemplateType.Elite) {
    baseHp = Math.floor(baseHp * 1.5);
  }

  return {
    id: `${template.name}-${seed}`,
    name: template.name,
    hp: { current: baseHp, max: baseHp },
    status: defaultStatus(),
  };
}

export function createBossEnemy(act: number, seed: string): BossEnemy {
  const rng = seedrandom(seed);
  const bossHp = Math.floor(rng() * 80 + 120); // 120-200 HP
  return {
    id: `boss-act${act}-${seed}`,
    name: `Act ${act} Boss`,
    hp: { current: bossHp, max: bossHp },
    status: defaultStatus(),
    phase2Threshold: Math.floor(bossHp * 0.5),
  };
}
