import { defaultPlayerState } from '../../../game/models/player-state';
import { grantArmor, applyDamageToPlayer, resetTemporaryArmor } from '../earth';

describe('Earth element', () => {
  test('grantArmor adds armor to player', () => {
    const player = defaultPlayerState();
    grantArmor(player, 6, 20); // 2 earth stones * 3 = 6
    expect(player.armor).toBe(6);
  });
  test('grantArmor respects cap', () => {
    const player = defaultPlayerState();
    grantArmor(player, 25, 20);
    expect(player.armor).toBe(20);
  });
  test('grantArmor stacks up to cap', () => {
    const player = defaultPlayerState();
    grantArmor(player, 15, 20);
    grantArmor(player, 10, 20);
    expect(player.armor).toBe(20);
  });
  test('applyDamageToPlayer: armor absorbs damage first', () => {
    const player = defaultPlayerState();
    player.armor = 10;
    applyDamageToPlayer(player, 6);
    expect(player.armor).toBe(4);
    expect(player.hp.current).toBe(80);
  });
  test('applyDamageToPlayer: overflow damage hits HP', () => {
    const player = defaultPlayerState();
    player.armor = 5;
    applyDamageToPlayer(player, 10);
    expect(player.armor).toBe(0);
    expect(player.hp.current).toBe(75);
  });
  test('applyDamageToPlayer: no armor, direct HP damage', () => {
    const player = defaultPlayerState();
    applyDamageToPlayer(player, 15);
    expect(player.hp.current).toBe(65);
  });
  test('resetTemporaryArmor clears non-fortified armor', () => {
    const player = defaultPlayerState();
    player.armor = 10;
    player.armorFortified = false;
    resetTemporaryArmor(player);
    expect(player.armor).toBe(0);
  });
  test('resetTemporaryArmor preserves fortified armor', () => {
    const player = defaultPlayerState();
    player.armor = 10;
    player.armorFortified = true;
    resetTemporaryArmor(player);
    expect(player.armor).toBe(10);
  });
  test('Fortify: 3+ earth stones sets fortified flag (documented)', () => {
    const player = defaultPlayerState();
    grantArmor(player, 9, 20, true); // fortify=true
    expect(player.armorFortified).toBe(true);
  });
});
