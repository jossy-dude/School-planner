import { StoredFile } from '@/db/schema';
import { addDaysId } from '@/features/attendance/logic';
import { BackupTableName } from '@/features/backup/tables';
import { composeDueAtMs } from '@/features/events/logic';
import { parseDateId, toDateId } from '@/lib/schedule';

export type SampleTables = Record<BackupTableName, Record<string, unknown>[]>;

// A full demo semester, built relative to `now` so every screen has something
// alive in it whenever it's loaded: today has classes, the calendar has dots
// across the week, something is overdue, the GPA has real percentages, and the
// attendance stamps go back three weeks.
//
// Fixed ids keep children pointing at parents (and make the builder testable).

const TERM_ID = 'term-sample';

const COURSES = [
  { id: 'c-alg', code: 'MTH201', name: 'Linear Algebra', emoji: '🧮', color: '#3B5BA5', pattern: 'dots', credits: 4, duration: 90 },
  { id: 'c-ds', code: 'CS210', name: 'Data Structures', emoji: '📘', color: '#2A7F8F', pattern: 'stripes', credits: 4, duration: 90 },
  { id: 'c-bio', code: 'BIO110', name: 'Cell Biology', emoji: '🔬', color: '#2E6B4F', pattern: 'grid', credits: 3, duration: 60 },
  { id: 'c-his', code: 'HIS230', name: 'Modern History', emoji: '📕', color: '#B5852A', pattern: 'dots', credits: 3, duration: 60 },
  { id: 'c-eng', code: 'ENG105', name: 'Academic Writing', emoji: '🎨', color: '#7A3B8F', pattern: 'stripes', credits: 3, duration: 60 },
] as const;

// Weekday: 0 = Sunday. Every weekday gets at least one class (weekend workshops
// included) so the Today hero card is never empty.
const PATTERNS = [
  { id: 'p-alg-mon', courseId: 'c-alg', weekday: 1, startTime: '09:00', endTime: '10:30', location: 'B-204' },
  { id: 'p-alg-wed', courseId: 'c-alg', weekday: 3, startTime: '09:00', endTime: '10:30', location: 'B-204' },
  { id: 'p-alg-fri', courseId: 'c-alg', weekday: 5, startTime: '09:00', endTime: '10:30', location: 'B-204' },
  { id: 'p-ds-mon', courseId: 'c-ds', weekday: 1, startTime: '11:00', endTime: '12:30', location: 'Lab 3' },
  { id: 'p-ds-thu', courseId: 'c-ds', weekday: 4, startTime: '11:00', endTime: '12:30', location: 'Lab 3' },
  { id: 'p-ds-sat', courseId: 'c-ds', weekday: 6, startTime: '10:00', endTime: '12:00', location: 'Lab 3' },
  { id: 'p-bio-tue', courseId: 'c-bio', weekday: 2, startTime: '08:30', endTime: '10:00', location: 'Sci-118' },
  { id: 'p-bio-thu', courseId: 'c-bio', weekday: 4, startTime: '13:00', endTime: '14:30', location: 'Sci-118' },
  { id: 'p-his-tue', courseId: 'c-his', weekday: 2, startTime: '15:00', endTime: '16:30', location: 'Hall C' },
  { id: 'p-his-fri', courseId: 'c-his', weekday: 5, startTime: '11:00', endTime: '12:30', location: 'Hall C' },
  { id: 'p-eng-wed', courseId: 'c-eng', weekday: 3, startTime: '14:00', endTime: '15:30', location: 'A-101' },
  { id: 'p-eng-sun', courseId: 'c-eng', weekday: 0, startTime: '16:00', endTime: '17:30', location: 'A-101' },
] as const;

interface GradePlan {
  categories: { name: string; weight: number }[];
  rows: { title: string; category: number; score: number; maxScore?: number; daysAgo: number }[];
}

const GRADE_PLANS: Record<string, GradePlan> = {
  'c-alg': {
    categories: [{ name: 'Homework', weight: 0.3 }, { name: 'Midterm', weight: 0.3 }, { name: 'Final', weight: 0.4 }],
    rows: [
      { title: 'Problem Set 1', category: 0, score: 88, daysAgo: 40 },
      { title: 'Problem Set 2', category: 0, score: 94, daysAgo: 33 },
      { title: 'Midterm Exam', category: 1, score: 79, daysAgo: 21 },
      { title: 'Problem Set 3', category: 0, score: 91, daysAgo: 12 },
    ],
  },
  'c-ds': {
    categories: [{ name: 'Labs', weight: 0.3 }, { name: 'Midterm', weight: 0.3 }, { name: 'Final', weight: 0.4 }],
    rows: [
      { title: 'Lab 1 — Arrays', category: 0, score: 96, daysAgo: 42 },
      { title: 'Lab 2 — Linked Lists', category: 0, score: 90, daysAgo: 28 },
      { title: 'Midterm', category: 1, score: 84, daysAgo: 20 },
      { title: 'Lab 3 — Trees', category: 0, score: 100, daysAgo: 9 },
    ],
  },
  'c-bio': {
    categories: [{ name: 'Quizzes', weight: 0.2 }, { name: 'Labs', weight: 0.3 }, { name: 'Exam', weight: 0.5 }],
    rows: [
      { title: 'Quiz 1 — Cells', category: 0, score: 17, maxScore: 20, daysAgo: 45 },
      { title: 'Lab Report — Microscopy', category: 1, score: 42, maxScore: 50, daysAgo: 35 },
      { title: 'Practical', category: 1, score: 46, maxScore: 50, daysAgo: 18 },
      { title: 'Quiz 2 — Mitosis', category: 0, score: 18, maxScore: 20, daysAgo: 8 },
    ],
  },
  'c-his': {
    categories: [{ name: 'Essays', weight: 0.4 }, { name: 'Participation', weight: 0.2 }, { name: 'Exam', weight: 0.4 }],
    rows: [
      { title: 'Essay 1 — Industrialisation', category: 0, score: 85, daysAgo: 40 },
      { title: 'Seminar Participation', category: 1, score: 18, maxScore: 20, daysAgo: 26 },
      { title: 'Essay 2 — Decolonisation', category: 0, score: 92, daysAgo: 11 },
    ],
  },
  'c-eng': {
    categories: [{ name: 'Portfolio', weight: 0.4 }, { name: 'Essays', weight: 0.6 }],
    rows: [
      { title: 'Personal Statement', category: 0, score: 87, daysAgo: 38 },
      { title: 'Annotated Bibliography', category: 1, score: 93, daysAgo: 24 },
      { title: 'Peer Review Workshop', category: 1, score: 19, maxScore: 20, daysAgo: 7 },
    ],
  },
};

const NOTES: { id: string; courseId: string; kind: 'teacher_said' | 'exam_tip'; body: string }[] = [
  { id: 'n-alg-1', courseId: 'c-alg', kind: 'teacher_said', body: 'Office hours move to Thursday 16:00 for the rest of term.' },
  { id: 'n-alg-2', courseId: 'c-alg', kind: 'exam_tip', body: 'Midterm is computation-heavy — bring a calculator that does fractions.' },
  { id: 'n-ds-1', courseId: 'c-ds', kind: 'teacher_said', body: 'Lab 4 pairs you up; find a partner before Friday.' },
  { id: 'n-ds-2', courseId: 'c-ds', kind: 'exam_tip', body: 'Big-O proofs are worth half the final — practise them, not just coding.' },
  { id: 'n-bio-1', courseId: 'c-bio', kind: 'teacher_said', body: 'Practical write-ups are due 48h after the session, not at week end.' },
  { id: 'n-bio-2', courseId: 'c-bio', kind: 'exam_tip', body: 'Labelled diagrams of organelles come up every single year.' },
  { id: 'n-his-1', courseId: 'c-his', kind: 'teacher_said', body: 'Essay 2 feedback goes out by email — no portal copies.' },
  { id: 'n-his-2', courseId: 'c-his', kind: 'exam_tip', body: 'Two essays, choose one: decolonisation OR the Cold War.' },
  { id: 'n-eng-1', courseId: 'c-eng', kind: 'teacher_said', body: 'Bring two printed drafts to the Sunday workshop.' },
  { id: 'n-eng-2', courseId: 'c-eng', kind: 'exam_tip', body: 'Citations: house style is Harvard — no APA, no MLA.' },
];

const SESSION_MINUTES = [55, 90, 40, 120, 75, 65, 45]; // oldest → today

export interface SampleFileSpec {
  id: string;
  courseId: string | null;
  name: string;
  category: 'materials' | 'assignments' | 'submissions' | 'other';
  description: string;
  body: string;
}

// Text files written into the app's own vault directory by the seeder, so the
// Vault's cards open to real content instead of a missing-file state.
export const SAMPLE_FILES: SampleFileSpec[] = [
  {
    id: 'f-alg-sheet', courseId: 'c-alg', name: 'Formula sheet.txt', category: 'materials',
    description: 'The one-page sheet allowed in the midterm.',
    body: 'LINEAR ALGEBRA — FORMULA SHEET\n\n- det([[a,b],[c,d]]) = ad - bc\n- A^-1 exists iff det(A) != 0\n- eigenvectors: (A - lambda I) v = 0\n- ||v||^2 = v . v\n- Gram-Schmidt: u1 = v1, u2 = v2 - proj_u1(v2)\n\nRemember: symmetric matrices always diagonalise.\n',
  },
  {
    id: 'f-alg-ps6', courseId: 'c-alg', name: 'Problem Set 6.txt', category: 'assignments',
    description: 'Due tonight — questions 1-8.',
    body: 'PROBLEM SET 6 (due today, 23:59)\n\n1-4  Diagonalise the given matrices.\n5-6  Orthogonalise with Gram-Schmidt.\n7    Show the eigenvectors of a symmetric matrix are orthogonal.\n8    Least-squares fit for the data on the handout.\n\nSubmit a single PDF. Working must be legible.\n',
  },
  {
    id: 'f-ds-cheat', courseId: 'c-ds', name: 'Complexity cheat sheet.txt', category: 'materials',
    description: 'Everything worth memorising for the final.',
    body: 'COMPLEXITY CHEAT SHEET\n\nArray access        O(1)\nLinked list search  O(n)\nBinary search       O(log n)\nHash map lookup     O(1) amortised\nHeap push / pop     O(log n)\nQuick sort (avg)    O(n log n)   worst O(n^2)\nMerge sort          O(n log n)\nBST search (avg)    O(log n)     worst O(n)\n\nGraphs: BFS/DFS O(V+E), Dijkstra O((V+E) log V).\n',
  },
  {
    id: 'f-bio-protocol', courseId: 'c-bio', name: 'Lab 3 protocol.txt', category: 'materials',
    description: 'Microscopy session — follow exactly.',
    body: 'LAB 3 — MICROSCOPY PROTOCOL\n\n1. Label both slides before touching the samples.\n2. Start at 4x, then 10x, then 40x. Never jump.\n3. Draw the field of view at each magnification.\n4. Measure 10 cells; record length and width.\n5. Write up within 48 hours.\n',
  },
  {
    id: 'f-his-outline', courseId: 'c-his', name: 'Essay 2 outline.txt', category: 'assignments',
    description: 'Working outline for the decolonisation essay.',
    body: 'ESSAY 2 — DECOLONISATION, 1945-1975\n\nThesis: decolonisation was driven more by economic strain than by Cold War pressure.\n\nI.   Post-war debt and the cost of empire\nII.  Nationalist movements 1945-1955\nIII. Suez as the turning point\nIV.  Portugal as the exception that proves it\nV.   Conclusion: independence was negotiated, not granted\n',
  },
  {
    id: 'f-misc-timetable', courseId: null, name: 'Exam timetable.txt', category: 'other',
    description: 'Straight from the notice board.',
    body: 'EXAM TIMETABLE — THIS SEMESTER\n\nMTH201  Mon 09:00  Hall A\nCS210   Wed 14:00  Hall B\nBIO110  Fri 09:00  Sci-118\nHIS230  Mon 14:00  Hall C\nENG105  Thu 11:00  A-101\n\nArrive 30 minutes early. No calculators for HIS230.\n',
  },
];

// Smallest n >= 1 that lands on `weekday` (0 = Sunday), counted from `dateId`.
function nextWeekday(dateId: string, weekday: number): string {
  for (let n = 1; n <= 7; n++) {
    const candidate = addDaysId(dateId, n);
    if (parseDateId(candidate).getDay() === weekday) return candidate;
  }
  return addDaysId(dateId, 1);
}

function buildAttendance(today: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (let back = 21; back >= 1; back--) {
    const dateId = addDaysId(today, -back);
    const weekday = parseDateId(dateId).getDay();
    for (const pattern of PATTERNS) {
      if (pattern.weekday !== weekday) continue;
      // Deterministic mix: mostly present, with enough absences and lates to
      // make the per-course attendance stats non-trivial.
      const roll = (back * 5 + pattern.id.length) % 17;
      const status = roll === 0 ? 'absent' : roll === 1 ? 'late' : 'present';
      rows.push({
        id: `att-${pattern.id}-${dateId}`,
        courseId: pattern.courseId,
        date: dateId,
        status,
        note: status === 'late' ? 'traffic' : null,
      });
    }
  }
  return rows;
}

function buildGrades(today: string): { categories: Record<string, unknown>[]; grades: Record<string, unknown>[] } {
  const categories: Record<string, unknown>[] = [];
  const grades: Record<string, unknown>[] = [];
  for (const course of COURSES) {
    const plan = GRADE_PLANS[course.id];
    if (!plan) continue;
    const categoryIds = plan.categories.map((_, index) => `gcat-${course.id}-${index}`);
    plan.categories.forEach((category, index) => {
      categories.push({ id: categoryIds[index], courseId: course.id, name: category.name, weight: category.weight });
    });
    plan.rows.forEach((row, index) => {
      grades.push({
        id: `g-${course.id}-${index}`,
        courseId: course.id,
        categoryId: categoryIds[row.category],
        title: row.title,
        score: row.score,
        maxScore: row.maxScore ?? 100,
        date: addDaysId(today, -row.daysAgo),
        note: null,
      });
    });
  }
  return { categories, grades };
}

export function buildSampleTables(now: Date, files: StoredFile[] = []): SampleTables {
  const today = toDateId(now);
  // drizzle's timestamp columns want Date objects, never raw epoch numbers.
  const due = (dateId: string, hhmm: string) => new Date(composeDueAtMs(dateId, hhmm));
  const { categories, grades } = buildGrades(today);
  const startDate = addDaysId(today, -56);
  const endDate = addDaysId(today, 112);

  return {
    terms: [{ id: TERM_ID, name: 'Semester 1', startDate, endDate }],
    courses: COURSES.map((course) => ({
      id: course.id,
      termId: TERM_ID,
      code: course.code,
      name: course.name,
      emoji: course.emoji,
      color: course.color,
      pattern: course.pattern,
      bannerUri: null,
      credits: course.credits,
      defaultDurationMin: course.duration,
      reminderLeadOverrideMin: null,
    })),
    schedulePatterns: PATTERNS.map((pattern) => ({ ...pattern, validFrom: null, validTo: null })),
    scheduleExceptions: [
      // One cancelled class in the near future so the calendar shows the
      // exception state, and one unscheduled extra session.
      {
        id: 'x-alg-cancelled',
        courseId: 'c-alg',
        patternId: 'p-alg-mon',
        date: nextWeekday(today, 1),
        kind: 'cancelled',
        startTime: null,
        endTime: null,
      },
      {
        id: 'x-bio-extra',
        courseId: 'c-bio',
        patternId: null,
        date: addDaysId(today, 3),
        kind: 'one_off',
        startTime: '17:00',
        endTime: '18:30',
      },
    ],
    gradeCategories: categories,
    grades,
    attendance: buildAttendance(today),
    events: [
      { id: 'e-ps6', kind: 'assignment', title: 'Problem Set 6', description: 'Diagonalisation + Gram-Schmidt.', courseId: 'c-alg', dueAt: due(today, '23:59'), done: false },
      { id: 'e-lab3', kind: 'assignment', title: 'Lab report 3', description: 'Microscopy write-up.', courseId: 'c-bio', dueAt: due(addDaysId(today, -2), '17:00'), done: false },
      { id: 'e-midterm', kind: 'test', title: 'Midterm', description: 'Chapters 1-6, closed book.', courseId: 'c-ds', dueAt: due(addDaysId(today, 1), '09:00'), done: false },
      { id: 'e-quiz4', kind: 'quiz', title: 'Quiz 4', description: 'Mitosis and cell signalling.', courseId: 'c-bio', dueAt: due(addDaysId(today, 4), '12:00'), done: false },
      { id: 'e-essay', kind: 'assignment', title: 'Essay 2 draft', description: 'Decolonisation, 1945-1975.', courseId: 'c-his', dueAt: due(addDaysId(today, 5), '23:59'), done: false },
      { id: 'e-club', kind: 'club', title: 'Robotics club', description: 'Build session in the workshop.', courseId: null, dueAt: due(addDaysId(today, 2), '16:00'), done: false },
      { id: 'e-reading', kind: 'assignment', title: 'Reading — ch. 12', description: '', courseId: 'c-his', dueAt: due(addDaysId(today, -1), '12:00'), done: true },
      { id: 'e-ps5', kind: 'assignment', title: 'Problem Set 5', description: '', courseId: 'c-alg', dueAt: due(addDaysId(today, -6), '23:59'), done: true },
      { id: 'e-jam', kind: 'meeting', title: 'Study jam', description: 'Library, group room 2.', courseId: null, dueAt: due(addDaysId(today, 6), '14:00'), done: false },
    ],
    studySessions: SESSION_MINUTES.map((durationMin, index) => ({
      id: `s-${index}`,
      courseId: COURSES[index % COURSES.length]!.id,
      startedAt: due(addDaysId(today, index - 6), '19:00'),
      durationMin,
      note: index === 6 ? 'half the goal already banked' : null,
    })),
    studyPromises: [
      { id: 'pr-alg', courseId: 'c-alg', subject: 'Linear Algebra', targetMin: 60, period: 'day' },
      { id: 'pr-ds', courseId: 'c-ds', subject: 'Data Structures', targetMin: 240, period: 'week' },
    ],
    files,
    notes: NOTES,
    gpaScales: [
      {
        id: 'scale-4.0',
        name: '4.0',
        rows: [
          { letter: 'A', minPct: 90, points: 4 },
          { letter: 'B', minPct: 80, points: 3 },
          { letter: 'C', minPct: 70, points: 2 },
          { letter: 'D', minPct: 60, points: 1 },
          { letter: 'F', minPct: 0, points: 0 },
        ],
        isDefault: true,
      },
    ],
    settings: [
      { key: 'reminder_lead_default_min', value: 60 },
      { key: 'study_goal_min', value: 120 },
      { key: 'week_start', value: 'monday' },
      { key: 'gpa_scale_id', value: 'scale-4.0' },
      { key: 'gpa_rounding', value: 2 },
      { key: 'gpa_excluded', value: [] },
      { key: 'backup_interval_days', value: 7 },
      { key: 'backup_last_at', value: null },
      { key: 'sound_enabled', value: true },
    ],
  };
}
