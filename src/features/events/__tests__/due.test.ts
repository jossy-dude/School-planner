import { composeDueAtMs, dueAtToParts } from '../logic';

it('composes a local deadline from date and time', () => {
  const d = new Date(composeDueAtMs('2026-09-25', '13:45'));
  expect(d.getFullYear()).toBe(2026);
  expect(d.getMonth()).toBe(8);
  expect(d.getDate()).toBe(25);
  expect(d.getHours()).toBe(13);
  expect(d.getMinutes()).toBe(45);
});

it('returns NaN for malformed date or time', () => {
  expect(composeDueAtMs('25/09/2026', '13:45')).toBeNaN();
  expect(composeDueAtMs('2026-09-25', '25:00')).toBeNaN();
  expect(composeDueAtMs('2026-09-25', '')).toBeNaN();
});

it('splits a deadline into date and time fields', () => {
  expect(dueAtToParts(new Date(2026, 8, 25, 13, 45).getTime()))
    .toEqual({ dateId: '2026-09-25', time: '13:45' });
});

it('splits a non-finite deadline into empty fields', () => {
  expect(dueAtToParts(Number.NaN)).toEqual({ dateId: '', time: '' });
});
