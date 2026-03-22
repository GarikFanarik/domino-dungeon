import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import './EventScreen.css';

interface Choice { label: string; description: string; }
interface GameEvent { id: string; title?: string; description: string; choices: Choice[]; }
interface Props { runId: string; }

export function EventScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/run/${runId}/event`)
      .then((r) => r.json())
      .then(setEvent)
      .catch(() => {});
  }, [runId]);

  async function handleChoice(index: number) {
    const res = await fetch(`/api/run/${runId}/event/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choiceIndex: index }),
    });
    const data = await res.json();
    setResult(data.message || 'Choice resolved.');
  }

  if (!event) {
    return <div className="event-loading">Unfolding the mystery…</div>;
  }

  return (
    <div className="event-screen">
      <div className="event-bg" />
      <div className="event-tint" />
      <div className="event-content">
        {result ? (
          <>
            <div className="event-result">{result}</div>
            <button className="btn-event-continue" onClick={() => navigate('dungeon-map')}>
              Continue
            </button>
          </>
        ) : (
          <>
            <h2 className="event-title">{event.title ?? 'Random Event'}</h2>
            <p className="event-description">{event.description}</p>
            <div className="event-choices">
              {event.choices.map((choice, i) => (
                <button key={i} className="btn-event-choice" onClick={() => handleChoice(i)}>
                  <span className="btn-event-choice-label">{choice.label}</span>
                  {choice.description && (
                    <> — <span className="btn-event-choice-desc">{choice.description}</span></>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
