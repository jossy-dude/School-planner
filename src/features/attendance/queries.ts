import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, Attendance } from '@/db/schema';
import { addDaysId, AttendanceStatus } from './logic';

export async function upsertAttendance(
  courseId: string,
  date: string,
  status: AttendanceStatus,
  note?: string,
): Promise<Attendance> {
  const [row] = await db
    .insert(attendance)
    .values({ courseId, date, status, note })
    .onConflictDoUpdate({
      target: [attendance.courseId, attendance.date],
      set: { status, note, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error('attendance upsert returned no row');
  return row;
}

export async function listAttendance(courseId: string): Promise<Attendance[]> {
  return db
    .select()
    .from(attendance)
    .where(eq(attendance.courseId, courseId))
    .orderBy(asc(attendance.date));
}

export async function listAttendanceInRange(startId: string, endId: string): Promise<Attendance[]> {
  return db
    .select()
    .from(attendance)
    .where(and(gte(attendance.date, startId), lte(attendance.date, endId)))
    .orderBy(asc(attendance.date));
}

export async function listWeekAttendance(mondayDate: string): Promise<Attendance[]> {
  return listAttendanceInRange(mondayDate, addDaysId(mondayDate, 6));
}
