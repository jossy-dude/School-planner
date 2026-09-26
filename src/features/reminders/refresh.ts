import { db } from '@/db';
import { courses } from '@/db/schema';
import { listEventsInRange } from '@/features/events/queries';
import { listExceptions, listPatterns } from '@/features/schedule/queries';
import { DEFAULT_SETTINGS } from '@/features/settings/logic';
import { readAllSettings } from '@/features/settings/queries';
import { planReminders } from '@/lib/reminders';
import { occurrencesInRange } from '@/lib/schedule';
import { catchUpMissed, ensureNotificationSetup, rescheduleAll } from './notify';

const HORIZON_DAYS = 14;
const DAY_MS = 86_400_000;

let chain: Promise<void> = Promise.resolve();

export function refreshReminders(): Promise<void> {
  chain = chain.then(runRefresh, runRefresh);
  return chain;
}

async function runRefresh(): Promise<void> {
  const nowMs = Date.now();
  const rangeEndMs = nowMs + HORIZON_DAYS * DAY_MS;
  // Single notification-setup site (root boot and store mutations both reach it through this chain),
  // and catch-up runs inside the same serialized run so it can never race this refresh's cancelAll.
  await ensureNotificationSetup();
  await catchUpMissed();
  const [patternRows, exceptionRows, courseRows, eventRows, stored] = await Promise.all([
    listPatterns(),
    listExceptions(),
    db.select().from(courses),
    listEventsInRange(nowMs, rangeEndMs),
    readAllSettings(),
  ]);
  const courseById = new Map(courseRows.map((c) => [c.id, c]));
  const plan = planReminders({
    occurrences: occurrencesInRange(patternRows, exceptionRows, nowMs, rangeEndMs),
    events: eventRows.filter((e) => !e.done).map((e) => {
      const course = e.courseId ? courseById.get(e.courseId) : undefined;
      return {
        id: e.id,
        title: e.title,
        dueAtMs: e.dueAt.getTime(),
        done: e.done,
        leadMin: e.remindLeadOverrideMin,
        courseName: course?.name,
      };
    }),
    nowMs,
    defaultLeadMin: stored.reminder_lead_default_min ?? DEFAULT_SETTINGS.reminder_lead_default_min,
    leadByCourse: Object.fromEntries(courseRows.map((c) => [c.id, c.reminderLeadOverrideMin] as const)),
    coursesById: Object.fromEntries(courseRows.map((c) => [c.id, { name: c.name, emoji: c.emoji }] as const)),
  });
  await rescheduleAll(plan);
}
