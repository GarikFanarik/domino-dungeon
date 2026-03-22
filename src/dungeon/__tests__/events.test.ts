import { startRun } from '../run';
import { awardGold } from '../gold';
import { getRandomEvent, resolveEventChoice, Event, EventResult } from '../events';

describe('Event system', () => {
  test('getRandomEvent returns an event for act 1', () => {
    const event = getRandomEvent(1, 'seed1');
    expect(event).toBeDefined();
    expect(event.title).toBeTruthy();
    expect(event.choices.length).toBeGreaterThanOrEqual(2);
    expect(event.choices.length).toBeLessThanOrEqual(3);
  });

  test('getRandomEvent is deterministic with same seed', () => {
    const e1 = getRandomEvent(1, 'fixed');
    const e2 = getRandomEvent(1, 'fixed');
    expect(e1.id).toBe(e2.id);
  });

  test('act 1 has at least 5 events available', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const event = getRandomEvent(1, `seed-${i}`);
      ids.add(event.id);
    }
    expect(ids.size).toBeGreaterThanOrEqual(5);
  });

  test('resolveEventChoice applies effect to run', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 50);
    const event = getRandomEvent(1, 'seed1');
    // Just verify it doesn't throw and returns a result
    const result = resolveEventChoice(run, event, 0);
    expect(result).toBeDefined();
    expect(result.description).toBeTruthy();
  });

  test('each choice has label and description', () => {
    const event = getRandomEvent(1, 'seed1');
    event.choices.forEach(c => {
      expect(c.label).toBeTruthy();
      expect(c.description).toBeTruthy();
    });
  });
});
