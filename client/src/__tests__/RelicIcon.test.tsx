import { render, screen } from '@testing-library/react';
import { RelicIcon } from '../components/RelicIcon';

const commonRelic = { type: 'worn-pouch', name: 'Worn Pouch', rarity: 'common', description: 'Bag starts with 2 extra stones' };
const rareRelic   = { type: 'ember-core',  name: 'Ember Core',  rarity: 'rare',   description: 'Fire stones deal +1 Burn stack' };
const epicRelic   = { type: 'phoenix',     name: 'Phoenix Feather', rarity: 'epic', description: 'Survive a lethal hit with 1 HP' };
const legendRelic = { type: 'crown',       name: 'Domino Crown', rarity: 'legendary', description: 'Doubles never end the chain' };

describe('RelicIcon', () => {
  it('renders relic name', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByText('Worn Pouch')).toBeInTheDocument();
  });

  it('renders rarity badge for common', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByText(/common/i)).toBeInTheDocument();
  });

  it('renders rarity badge for rare', () => {
    render(<RelicIcon relic={rareRelic} />);
    expect(screen.getByText(/rare/i)).toBeInTheDocument();
  });

  it('renders rarity badge for epic', () => {
    render(<RelicIcon relic={epicRelic} />);
    expect(screen.getByText(/epic/i)).toBeInTheDocument();
  });

  it('renders rarity badge for legendary', () => {
    render(<RelicIcon relic={legendRelic} />);
    expect(screen.getByText(/legendary/i)).toBeInTheDocument();
  });

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

  it('shows description as title attribute for tooltip', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByTitle('Bag starts with 2 extra stones')).toBeInTheDocument();
  });
});
