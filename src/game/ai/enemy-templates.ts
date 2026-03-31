import seedrandom from 'seedrandom';
import { Enemy, EnemyStatus } from '../models/enemy';
import { ElementType } from '../models/stone';

export interface EnemyBagConfig {
  pipSumRange: [number, number];
  elements: ElementType[];
  elementalDensity: number;
}

const ENEMY_BAG_CONFIGS: Record<string, EnemyBagConfig> = {
  'Tomb Rat':       { pipSumRange: [2, 5],  elements: [ElementType.Poison],                         elementalDensity: 0.10 },
  'Crypt Sentinel': { pipSumRange: [5, 7],  elements: [ElementType.Earth],                           elementalDensity: 0.20 },
  'Stonewarden':    { pipSumRange: [8, 12], elements: [ElementType.Earth],                           elementalDensity: 0.30 },
  'Abyssal Crystal':{ pipSumRange: [4, 7],  elements: [ElementType.Ice],                             elementalDensity: 0.20 },
  'Abyssal Warrior':{ pipSumRange: [5, 8],  elements: [ElementType.Lightning],                       elementalDensity: 0.25 },
  'Abyssal Lord':   { pipSumRange: [8, 12], elements: [ElementType.Ice, ElementType.Lightning],      elementalDensity: 0.35 },
};

const NEUTRAL_BAG_CONFIG: EnemyBagConfig = { pipSumRange: [0, 12], elements: [], elementalDensity: 0 };

export function getEnemyBagConfig(enemyName: string): EnemyBagConfig {
  return ENEMY_BAG_CONFIGS[enemyName] ?? NEUTRAL_BAG_CONFIG;
}

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
