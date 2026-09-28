import { formatCountdown, formatClock } from '../format';
it('formats under an hour as MM:SS', () => { expect(formatCountdown(5 * 60_000 + 9_000)).toBe('05:09'); });
it('formats hours', () => { expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe('2H 05M'); });
it('formats days', () => { expect(formatCountdown(30 * 3600_000)).toBe('>1D'); });
it('formats clock HH:MM:SS', () => { expect(formatClock(3661_000)).toBe('01:01:01'); });
it('clamps negatives to zero', () => { expect(formatCountdown(-5)).toBe('00:00'); });
