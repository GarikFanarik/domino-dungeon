import { relicImage, RELIC_IMAGES } from '../utils/relicImage';

describe('relicImage', () => {
  it('returns the correct path for a known relic type', () => {
    expect(relicImage('worn-pouch')).toBe('/assets/relics/common/coin_purse.png');
  });

  it('returns undefined for an unknown relic type', () => {
    expect(relicImage('not-a-relic')).toBeUndefined();
  });

  it('exports RELIC_IMAGES as a record', () => {
    expect(RELIC_IMAGES['phoenix-feather']).toBe('/assets/relics/epic/fire_feather.png');
  });

  it('covers all 21 relics', () => {
    expect(Object.keys(RELIC_IMAGES)).toHaveLength(21);
  });
});
