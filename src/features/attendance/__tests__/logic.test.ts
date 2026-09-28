import { attendanceStats, weekProgress } from '../logic';
it('computes rate counting late+excused as attended', () => {
  const s = attendanceStats([{ status: 'present' }, { status: 'present' }, { status: 'absent' }, { status: 'late' }, { status: 'excused' }]);
  expect(s).toEqual({ present: 2, absent: 1, late: 1, excused: 1, rate: 4 / 5 });
});
it('empty stats → rate 0', () => {
  expect(attendanceStats([]).rate).toBe(0);
});
it('week progress guards zero total', () => {
  expect(weekProgress(0, 0)).toBe(0);
  expect(weekProgress(4, 3)).toBe(0.75);
});
