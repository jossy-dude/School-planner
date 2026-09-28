import renderer, { act } from 'react-test-renderer';
import { Course, StudySession } from '@/db/schema';
import { TimerState } from '@/lib/timer/logic';
import { SessionHistory } from '../components/SessionHistory';
import { SubjectPicker } from '../components/SubjectPicker';
import { TimerFace } from '../components/TimerFace';

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

const course = (id: string, emoji: string, name: string): Course =>
  ({
    id, termId: null, code: '', name, emoji, color: '#141414', pattern: 'dots',
    bannerUri: null, credits: 3, defaultDurationMin: 60, reminderLeadOverrideMin: null,
    updatedAt: new Date(),
  }) as Course;

const running = (remainingMs: number): TimerState =>
  ({ status: 'running', courseId: 'c1', startedAtMs: 1_000, remainingMs, targetMs: 60_000 });

it('TimerFace counts down from the anchor projection while running', async () => {
  // remaining 50s anchored at t=1000, displayed at t=6000 → 45s left.
  const { found } = await render(<TimerFace state={running(50_000)} nowMs={6_000} />);
  expect(found).toContain('00:45');
});

it('TimerFace freezes the countdown while paused', async () => {
  const paused: TimerState = { status: 'paused', courseId: 'c1', startedAtMs: 1_000, remainingMs: 50_000, targetMs: 60_000 };
  const { found } = await render(<TimerFace state={paused} nowMs={999_000} />);
  expect(found).toContain('00:50');
});

it('SubjectPicker renders NONE plus course emoji chips and disables presses', async () => {
  const onSelect = jest.fn();
  const { found, json } = await render(
    <SubjectPicker courses={[course('c1', '📘', 'Maths')]} selectedId={null} onSelect={onSelect} disabled />,
  );
  expect(found).toContain('NONE');
  expect(found).toContain('📘');
  expect(json).toContain('"disabled":true');
});

it('SessionHistory shows the empty state without sessions', async () => {
  const { found } = await render(<SessionHistory sessions={[]} courses={[]} />);
  expect(found).toContain('no sessions yet');
});

it('SessionHistory renders duration, emoji, and date rows', async () => {
  const session = {
    id: 's1', courseId: 'c1', startedAt: new Date('2026-09-20T10:00:00Z'), durationMin: 45,
    note: null, updatedAt: new Date(),
  } as StudySession;
  const { found, json } = await render(<SessionHistory sessions={[session]} courses={[course('c1', '📘', 'Maths')]} />);
  // duration renders as JSX children ["45", "M"] — assert on the joined row text.
  expect(json).toContain('["45","M"]');
  expect(found).toContain('📘');
  expect(found.some((t) => /^\d{4}-\d{2}-\d{2}$/.test(t))).toBe(true);
});
