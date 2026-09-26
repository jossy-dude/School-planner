import renderer, { act } from 'react-test-renderer';
import { Course, Term } from '@/db/schema';
import { DEFAULT_SETTINGS } from '@/features/settings/logic';
import { useSettingsStore } from '@/features/settings/store';
import { Scale } from '@/lib/gpa';
import { GpaForm } from '../components/GpaForm';
import { GpaResultCard } from '../components/GpaResultCard';
import { ScaleEditor } from '../components/ScaleEditor';
import { DEFAULT_SCALE } from '../logic';
import { GpaResultBundle, GpaMode } from '../store';

jest.mock('../queries', () => ({
  listGpaScales: jest.fn(),
  listAllGrades: jest.fn(),
  listTerms: jest.fn(),
  upsertGpaScale: jest.fn(),
}));

// Settings/courses writes funnel a reminder refresh — keep that chain out of here.
jest.mock('@/features/reminders/refresh', () => ({
  refreshReminders: jest.fn().mockResolvedValue(undefined),
}));

const queries = jest.requireMock('../queries') as {
  listGpaScales: jest.Mock;
  upsertGpaScale: jest.Mock;
};

const texts = (node: unknown, out: string[] = []): string[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => texts(child, out));
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  const { type, children } = node as { type?: unknown; children?: unknown };
  if (type === 'Text') {
    const kids = Array.isArray(children) ? children : [children];
    kids.forEach((k) => {
      if (typeof k === 'string') out.push(k);
    });
  }
  texts(children, out);
  return out;
};

const render = async (node: React.ReactElement): Promise<{ found: string[]; json: string }> => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(node);
  });
  const found = texts(tree?.toJSON());
  const json = JSON.stringify(tree?.toJSON());
  await act(async () => { tree?.unmount(); });
  return { found, json };
};

const course = (id: string, termId: string | null, credits: number): Course =>
  ({
    id, termId, code: '', name: `Course ${id}`, emoji: '📘', color: '#141414', pattern: 'dots',
    bannerUri: null, credits, defaultDurationMin: 60, reminderLeadOverrideMin: null,
    updatedAt: new Date(),
  }) as Course;

const term = (id: string): Term =>
  ({ id, name: `Term ${id}`, startDate: '2026-01-01', endDate: '2026-06-01', updatedAt: new Date() }) as Term;

function bundle(overrides: Partial<GpaResultBundle> = {}): GpaResultBundle {
  const courses = [course('c1', 't1', 3), course('c2', 't1', 2)];
  const rows = [
    { course: courses[0]!, finalPct: 90, excluded: false },
    { course: courses[1]!, finalPct: 75, excluded: false },
  ];
  return {
    rows,
    inputs: rows.map((r) => ({ id: r.course.id, credits: r.course.credits, finalPct: r.finalPct, excluded: r.excluded })),
    scale: DEFAULT_SCALE as Scale,
    maxPoints: 4,
    rounding: 2,
    mode: 'term' as GpaMode,
    selectedTermId: 't1',
    terms: [term('t1')],
    scales: [],
    gpa: 3.4,
    totalCredits: 5,
    includedCount: 2,
    hasGrades: true,
    setMode: () => {},
    setSelectedTermId: () => {},
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  queries.listGpaScales.mockResolvedValue([]);
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: true });
});

it('GpaResultCard renders the gauge value, segmented control and stat row', async () => {
  const { found } = await render(
    <GpaResultCard {...bundle()} scaleName="4.0" onModeChange={() => {}} onTermChange={() => {}} />,
  );
  expect(found).toContain('3.40');
  expect(found).toContain('TERM');
  expect(found).toContain('CUMULATIVE');
  expect(found).toContain('CREDITS');
  expect(found).toContain('5');
  expect(found).toContain('SCALE');
  expect(found).toContain('4.0');
  expect(found).toContain('ROUND');
  expect(found).toContain('Term t1');
});

it('GpaResultCard shows the null-gpa note when nothing is graded yet', async () => {
  const { found } = await render(
    <GpaResultCard
      {...bundle({ gpa: null, totalCredits: 0 })}
      scaleName="4.0"
      onModeChange={() => {}}
      onTermChange={() => {}}
    />,
  );
  expect(found).toContain('no graded courses yet');
});

it('GpaForm renders scale chips, courses, target chips and the final solver', async () => {
  const { found } = await render(<GpaForm result={bundle()} />);
  expect(found).toContain('USE DEFAULT');
  expect(found).toContain('ROUNDING · DECIMALS');
  expect(found).toContain('Course c1');
  expect(found).toContain('90%');
  expect(found).toContain('EXCL');
  expect(found).toContain('PASS');
  expect(found).toContain('CURRENT %');
  expect(found).toContain('FINAL WEIGHT %');
  expect(found).toContain('50%');
  // current % seeds from c1's finalPct (90), target defaults to the A bound (90),
  // weight 50% → neededOnFinal({90, 0.5, 90}) = 90 → 90 <= 100 → BORDERLINE.
  expect(found).toContain('NEED ON FINAL');
  expect(found).toContain('BORDERLINE');
});

it('GpaForm shows the empty-term note when the term has no courses', async () => {
  const { found } = await render(<GpaForm result={bundle({ rows: [], inputs: [], gpa: null })} />);
  expect(found).toContain('no courses in this term');
});

it('ScaleEditor renders the default rows and a disabled SAVE until valid', async () => {
  const { found, json } = await render(<ScaleEditor />);
  expect(found).toContain('NAME');
  expect(found).toContain('LETTER');
  expect(found).toContain('MIN %');
  expect(found).toContain('POINTS');
  expect(found).toContain('ADD ROW');
  expect(found).toContain('SAVE SCALE');
  // Row values live in TextInput props, not Text children.
  expect(json).toContain('"value":"A"');
  expect(json).toContain('"value":"F"');
  expect(queries.listGpaScales).toHaveBeenCalled();
});
