import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { RelicIcon } from '../components/RelicIcon';
import { RELIC_DEFINITIONS } from '../data/relics';
import './ShopScreen.css';

interface ShopItem {
  id: string;
  type: string;
  name: string;
  description: string;
  cost: number;
  sold: boolean;
  element: string | null;
  relicId: string | null;
}

interface ShopState {
  items: ShopItem[];
  playerGold: number;
}

interface Props { runId: string; }

export function ShopScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [shop, setShop] = useState<ShopState | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/run/${runId}/shop`)
      .then((r) => r.json())
      .then(setShop)
      .catch(() => {});
  }, [runId]);

  async function handleBuy(itemId: string) {
    const res = await fetch(`/api/run/${runId}/shop/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Purchase failed'); return; }
    setMessage('');
    const shopRes = await fetch(`/api/run/${runId}/shop`);
    setShop(await shopRes.json());
  }

  async function handleLeave() {
    await fetch(`/api/run/${runId}/shop/leave`, { method: 'POST' });
    navigate('dungeon-map');
  }

  if (!shop) {
    return <div className="shop-loading">Opening the merchant's wares…</div>;
  }

  return (
    <div className="shop-screen">
      <div className="shop-bg" />
      <div className="shop-tint" />
      <div className="shop-content">
        <div className="shop-header">
          <h2 className="shop-title">Merchant</h2>
          <span className="shop-gold">
            <span className="shop-gold-label">Gold</span>
            {shop.playerGold}g
          </span>
        </div>

        {message && <p className="shop-message">{message}</p>}

        <div className="shop-items">
          {shop.items.map((item) => (
            <div key={item.id} className={`shop-item-card${item.sold ? ' shop-item-card--sold' : ''}`}>
              {item.type === 'relic' && item.relicId && RELIC_DEFINITIONS[item.relicId] && (
                <RelicIcon relic={RELIC_DEFINITIONS[item.relicId]} />
              )}
              <div className={`shop-item-name${item.sold ? ' shop-item-name--sold' : ''}`}>
                {item.name}
                {item.type === 'stone' && item.element && (
                  <span className={`shop-element-badge shop-element-badge--${item.element.toLowerCase()}`}>
                    {item.element}
                  </span>
                )}
              </div>
              <div className="shop-item-desc">{item.description}</div>
              <div className="shop-item-footer">
                <span className="shop-item-cost">{item.cost}g</span>
                <button
                  className="btn-shop-buy"
                  onClick={() => handleBuy(item.id)}
                  disabled={item.sold || shop.playerGold < item.cost}
                >
                  {item.sold ? 'Sold' : 'Buy'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-shop-leave" onClick={handleLeave}>Leave Shop</button>
      </div>
    </div>
  );
}
