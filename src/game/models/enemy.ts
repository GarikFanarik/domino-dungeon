export interface EnemyStatus {
  burn: number;
  slow: number;
  frozen: boolean;
  stunned: boolean;
  poison: number;
}

export interface Enemy {
  id: string;
  name: string;
  hp: { current: number; max: number };
  status: EnemyStatus;
}
