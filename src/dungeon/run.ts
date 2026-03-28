import { randomUUID } from 'crypto';

export enum RunStatus {
  Active = 'ACTIVE',
  Won = 'WON',
  Lost = 'LOST',
}

export interface Run {
  id: string;
  userId: string;
  seed: string;
  currentAct: number;
  currentNodeId: string | null;
  status: RunStatus;
  hp: number;
  maxHp: number;
  gold: number;
  relics: string[];
  relicOfferCount: number;
  completedAt: Date | null;
  createdAt: Date;
}

export function startRun(userId: string, seed: string): Run {
  return {
    id: randomUUID(),
    userId,
    seed,
    currentAct: 1,
    currentNodeId: null,
    status: RunStatus.Active,
    hp: 80,
    maxHp: 80,
    gold: 0,
    relics: [],
    relicOfferCount: 0,
    completedAt: null,
    createdAt: new Date(),
  };
}

export function completeRun(run: Run): void {
  run.status = RunStatus.Won;
  run.completedAt = new Date();
}

export function failRun(run: Run): void {
  run.status = RunStatus.Lost;
  run.completedAt = new Date();
}

export function getRunStatus(run: Run): RunStatus {
  return run.status;
}
