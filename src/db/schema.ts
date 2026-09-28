import { integer, real, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = () => (require('expo-crypto') as typeof import('expo-crypto')).randomUUID();

const id = () => text('id').primaryKey().$defaultFn(() => crypto());
const ts = () => integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date());

export const terms = sqliteTable('terms', {
  id: id(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  updatedAt: ts(),
});

export const courses = sqliteTable('courses', {
  id: id(),
  termId: text('term_id').references(() => terms.id, { onDelete: 'set null' }),
  code: text('code').notNull().default(''),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📘'),
  color: text('color').notNull().default('#141414'),
  pattern: text('pattern', { enum: ['dots', 'stripes', 'grid'] }).notNull().default('dots'),
  bannerUri: text('banner_uri'),
  credits: real('credits').notNull().default(1),
  defaultDurationMin: integer('default_duration_min').notNull().default(60),
  reminderLeadOverrideMin: integer('reminder_lead_override_min'),
  updatedAt: ts(),
});

export const schedulePatterns = sqliteTable('schedule_patterns', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(), // 0 = Sunday
  startTime: text('start_time').notNull(), // "HH:MM"
  endTime: text('end_time').notNull(),
  location: text('location'),
  validFrom: text('valid_from'), // "YYYY-MM-DD"
  validTo: text('valid_to'),
  updatedAt: ts(),
}, (t) => [index('patterns_course_idx').on(t.courseId)]);

export const scheduleExceptions = sqliteTable('schedule_exceptions', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  patternId: text('pattern_id').references(() => schedulePatterns.id, { onDelete: 'set null' }),
  date: text('date').notNull(), // "YYYY-MM-DD"
  kind: text('kind', { enum: ['one_off', 'cancelled'] }).notNull(),
  startTime: text('start_time'),
  endTime: text('end_time'),
  updatedAt: ts(),
}, (t) => [uniqueIndex('exc_course_date_uq').on(t.courseId, t.date)]);

export const attendance = sqliteTable('attendance', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  status: text('status', { enum: ['present', 'absent', 'late', 'excused'] }).notNull(),
  note: text('note'),
  updatedAt: ts(),
}, (t) => [uniqueIndex('att_course_date_uq').on(t.courseId, t.date)]);

export const events = sqliteTable('events', {
  id: id(),
  kind: text('kind', { enum: ['assignment', 'test', 'quiz', 'club', 'meeting', 'other'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  remindLeadOverrideMin: integer('remind_lead_override_min'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  updatedAt: ts(),
}, (t) => [index('events_due_idx').on(t.dueAt)]);

export const gradeCategories = sqliteTable('grade_categories', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  weight: real('weight').notNull().default(1),
  updatedAt: ts(),
});

export const grades = sqliteTable('grades', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => gradeCategories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  score: real('score').notNull(),
  maxScore: real('max_score').notNull().default(100),
  weightOverride: real('weight_override'),
  date: text('date').notNull(),
  note: text('note'),
  updatedAt: ts(),
}, (t) => [index('grades_course_idx').on(t.courseId)]);

export const gpaScales = sqliteTable('gpa_scales', {
  id: id(),
  name: text('name').notNull(),
  rows: text('rows', { mode: 'json' }).$type<{ letter: string; minPct: number; points: number }[]>().notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  updatedAt: ts(),
});

export const studySessions = sqliteTable('study_sessions', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  durationMin: integer('duration_min').notNull(),
  note: text('note'),
  updatedAt: ts(),
}, (t) => [index('sessions_started_idx').on(t.startedAt)]);

export const studyPromises = sqliteTable('study_promises', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  subject: text('subject').notNull(),
  targetMin: integer('target_min').notNull(),
  period: text('period', { enum: ['day', 'week'] }).notNull().default('day'),
  updatedAt: ts(),
});

export const files = sqliteTable('files', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  category: text('category', { enum: ['materials', 'assignments', 'submissions', 'other'] }).notNull().default('other'),
  name: text('name').notNull(),
  sandboxUri: text('sandbox_uri').notNull(),
  size: integer('size').notNull().default(0),
  mime: text('mime'),
  description: text('description'),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: ts(),
});

export const notes = sqliteTable('notes', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['teacher_said', 'exam_tip'] }).notNull(),
  body: text('body').notNull(),
  description: text('description'),
  updatedAt: ts(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
  updatedAt: ts(),
});

export const termsRelations = relations(terms, ({ many }) => ({ courses: many(courses) }));
export const coursesRelations = relations(courses, ({ one, many }) => ({
  term: one(terms, { fields: [courses.termId], references: [terms.id] }),
  patterns: many(schedulePatterns),
  grades: many(grades),
  files: many(files),
  notes: many(notes),
}));
export const schedulePatternsRelations = relations(schedulePatterns, ({ one }) => ({
  course: one(courses, { fields: [schedulePatterns.courseId], references: [courses.id] }),
}));
export const gradeCategoriesRelations = relations(gradeCategories, ({ one, many }) => ({
  course: one(courses, { fields: [gradeCategories.courseId], references: [courses.id] }),
  grades: many(grades),
}));
export const gradesRelations = relations(grades, ({ one }) => ({
  course: one(courses, { fields: [grades.courseId], references: [courses.id] }),
  category: one(gradeCategories, { fields: [grades.categoryId], references: [gradeCategories.id] }),
}));

export type Term = typeof terms.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Pattern = typeof schedulePatterns.$inferSelect;
export type ScheduleException = typeof scheduleExceptions.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type SchoolEvent = typeof events.$inferSelect;
export type GradeCategory = typeof gradeCategories.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type GpaScale = typeof gpaScales.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type StudyPromise = typeof studyPromises.$inferSelect;
export type StoredFile = typeof files.$inferSelect;
export type Note = typeof notes.$inferSelect;
