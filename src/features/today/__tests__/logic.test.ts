import { agendaState, studyToday } from '../logic';

const at = (h: number, m = 0) => new Date(2024, 4, 15, h, m).getTime();

describe('agendaState', () => {
  const occ = { startMs: at(9), endMs: at(10) };
  it('is upcoming before start', () => { expect(agendaState(occ, at(8, 59))).toBe('upcoming'); });
  it('is now from start until end', () => {
    expect(agendaState(occ, at(9))).toBe('now');
    expect(agendaState(occ, at(9, 59))).toBe('now');
  });
  it('is past at and after end', () => { expect(agendaState(occ, at(10))).toBe('past'); });
});

describe('studyToday', () => {
  const now = at(15);
  it("sums only today's sessions across all subjects", () => {
    const sessions = [
      { startedAtMs: at(8), durationMin: 30, courseId: 'a' },
      { startedAtMs: at(11), durationMin: 45, courseId: 'b' },
      { startedAtMs: new Date(2024, 4, 14, 20).getTime(), durationMin: 90, courseId: 'a' },
    ];
    expect(studyToday(sessions, 150, now, 'monday')).toEqual({ doneMin: 75, goalMin: 150, ratio: 0.5 });
  });
  it('caps ratio at 1 when over goal', () => {
    expect(studyToday([{ startedAtMs: at(9), durationMin: 200 }], 120, now, 'monday').ratio).toBe(1);
  });
  it('gives ratio 0 for a zero goal', () => {
    expect(studyToday([{ startedAtMs: at(9), durationMin: 20 }], 0, now, 'monday').ratio).toBe(0);
  });
});
