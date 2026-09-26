import { parseDateId, toDateId } from '@/lib/schedule';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceStat {
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number; /*0..1*/
}

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

const ATTENDED: ReadonlySet<AttendanceStatus> = new Set<AttendanceStatus>(['present', 'late', 'excused']);

export function attendanceStats(rows: { status: AttendanceStatus }[]): AttendanceStat {
  const stat: AttendanceStat = { present: 0, absent: 0, late: 0, excused: 0, rate: 0 };
  for (const row of rows) {
    if (row.status === 'present') stat.present += 1;
    else if (row.status === 'absent') stat.absent += 1;
    else if (row.status === 'late') stat.late += 1;
    else if (row.status === 'excused') stat.excused += 1;
  }
  const total = stat.present + stat.absent + stat.late + stat.excused;
  stat.rate = total === 0 ? 0 : (stat.present + stat.late + stat.excused) / total;
  return stat;
}

export function weekProgress(sessionsThisWeek: number, attended: number): number {
  return sessionsThisWeek === 0 ? 0 : attended / sessionsThisWeek;
}

export function isAttended(status: AttendanceStatus): boolean {
  return ATTENDED.has(status);
}

export function statusStamp(status: AttendanceStatus): { text: string; tone: 'ink' | 'danger' } {
  if (status === 'present') return { text: 'OK', tone: 'ink' };
  if (status === 'absent') return { text: 'ABSENT', tone: 'danger' };
  if (status === 'late') return { text: 'LATE', tone: 'ink' };
  return { text: 'EXCUSED', tone: 'ink' };
}

export function addDaysId(dateId: string, days: number): string {
  const d = parseDateId(dateId);
  return toDateId(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function weekStartId(dateId: string, weekStart: 'sunday' | 'monday'): string {
  const d = parseDateId(dateId);
  const offset = weekStart === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
  return toDateId(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
}
