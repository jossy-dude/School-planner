import { formatCountdown, formatClock, formatDurationMin, formatTimeOfDay } from '../format';
it('formats under an hour as MM:SS', () => { expect(formatCountdown(5 * 60_000 + 9_000)).toBe('05:09'); });
it('formats hours', () => { expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe('2H 05M'); });
it('formats days', () => { expect(formatCountdown(30 * 3600_000)).toBe('>1D'); });
it('formats clock HH:MM:SS', () => { expect(formatClock(3661_000)).toBe('01:01:01'); });
it('clamps negatives to zero', () => { expect(formatCountdown(-5)).toBe('00:00'); });

describe('formatTimeOfDay', () => {
  it('formats a morning time with zero-padding', () => {
    const d = new Date(2024, 0, 1, 9, 5);
    expect(formatTimeOfDay(d.getTime())).toBe('09:05');
  });
  it('formats a 24h afternoon time', () => {
    const d = new Date(2024, 0, 1, 14, 30);
    expect(formatTimeOfDay(d.getTime())).toBe('14:30');
  });
});

describe('formatDurationMin', () => {
  it('formats minutes only', () => { expect(formatDurationMin(45)).toBe('45m'); });
  it('formats whole hours', () => { expect(formatDurationMin(120)).toBe('2h'); });
  it('formats hours and minutes', () => { expect(formatDurationMin(95)).toBe('1h 35m'); });
  it('clamps negatives to 0m', () => { expect(formatDurationMin(-10)).toBe('0m'); });
});
