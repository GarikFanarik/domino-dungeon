import { PlayerState } from '../models/player-state';

export function grantArmor(player: PlayerState, amount: number, cap: number, fortify: boolean = false): void {
  player.armor = Math.min(cap, player.armor + amount);
  if (fortify) player.armorFortified = true;
}

export function applyDamageToPlayer(player: PlayerState, damage: number): void {
  const armorAbsorbed = Math.min(player.armor, damage);
  player.armor -= armorAbsorbed;
  const remaining = damage - armorAbsorbed;
  player.hp.current = Math.max(0, player.hp.current - remaining);
}

export function resetTemporaryArmor(player: PlayerState): void {
  if (!player.armorFortified) {
    player.armor = 0;
  }
}
