import { render, screen } from '@testing-library/react';
import { RelicIcon } from '../components/RelicIcon';

const commonRelic   = { type: 'worn-pouch',      name: 'Worn Pouch',      rarity: 'common'    as const, description: 'Draw 1 extra stone' };
const rareRelic     = { type: 'ember-core',       name: 'Ember Core',      rarity: 'rare'      as const, description: 'Burn never decays' };
const epicRelic     = { type: 'phoenix-feather',  name: 'Phoenix Feather', rarity: 'epic'      as const, description: 'Survive one lethal hit' };
const legendRelic   = { type: 'domino-crown',     name: 'Domino Crown',    rarity: 'legendary' as const, description: 'Doubles rule' };
const unknownRelic  = { type: 'not-a-relic',      name: 'Unknown',         rarity: 'common'    as const, description: 'No image' };

describe('RelicIcon', () => {
  it('applies common rarity class', () => {
    const { container } = render(<RelicIcon relic={commonRelic} />);
    expect(container.querySelector('.relic-icon--common')).toBeInTheDocument();
  });

  it('applies rare rarity class', () => {
    const { container } = render(<RelicIcon relic={rareRelic} />);
    expect(container.querySelector('.relic-icon--rare')).toBeInTheDocument();
  });

  it('applies epic rarity class', () => {
    const { container } = render(<RelicIcon relic={epicRelic} />);
    expect(container.querySelector('.relic-icon--epic')).toBeInTheDocument();
  });

  it('applies legendary rarity class', () => {
    const { container } = render(<RelicIcon relic={legendRelic} />);
    expect(container.querySelector('.relic-icon--legendary')).toBeInTheDocument();
  });

  it('renders img when image exists for type', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByRole('img', { name: 'Worn Pouch' })).toBeInTheDocument();
  });

  it('renders fallback emoji when no image for type', () => {
    render(<RelicIcon relic={unknownRelic} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('shows description as title attribute', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByTitle('Draw 1 extra stone')).toBeInTheDocument();
  });

  it('adds glowing class when glowing prop is true', () => {
    const { container } = render(<RelicIcon relic={commonRelic} glowing />);
    expect(container.querySelector('.relic-icon--glowing')).toBeInTheDocument();
  });

  it('does not render name or rarity text labels', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.queryByText('Worn Pouch')).toBeNull();
    expect(screen.queryByText('common')).toBeNull();
  });
});
