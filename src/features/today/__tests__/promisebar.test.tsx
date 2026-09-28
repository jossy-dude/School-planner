import renderer, { act } from 'react-test-renderer';
import { StudyPromise } from '@/db/schema';
import { PromiseSession } from '@/lib/promises/logic';
import { TickBar } from '@/ui/tickbar';
import { PromiseBar } from '../components/PromiseBar';

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

// react-test-renderer unwraps memo() fibers — look TickBar up by its inner type.
const findTickBar = (tree: renderer.ReactTestRenderer) =>
  tree.root.findByType(TickBar.type);

const render = async (node: React.ReactElement): Promise<{ found: string[]; tree: renderer.ReactTestRenderer }> => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(node);
  });
  return { found: texts(tree?.toJSON()), tree: tree! };
};

// Monday Sep 28 2026, noon — sessions below share this local date.
const NOW = new Date(2026, 8, 28, 12).getTime();
const promise = (over: Partial<StudyPromise> = {}): StudyPromise =>
  ({
    id: 'p1', courseId: 'c1', subject: 'Maths', targetMin: 60, period: 'week',
    updatedAt: new Date(), ...over,
  }) as StudyPromise;
const session = (durationMin: number, over: Partial<PromiseSession> = {}): PromiseSession =>
  ({ startedAtMs: new Date(2026, 8, 28, 9).getTime(), durationMin, courseId: 'c1', ...over });

it('renders subject, course emoji, and the DSEG7 done/target ratio', async () => {
  const { found, tree } = await render(
    <PromiseBar promise={promise()} sessions={[session(45)]} nowMs={NOW} weekStart="monday" emoji="📘" />,
  );
  expect(found).toContain('Maths');
  expect(found).toContain('📘');
  expect(found).toContain('45/60');
  await act(async () => { tree.unmount(); });
});

it('falls back to the ◔ placeholder without a course emoji', async () => {
  const { found, tree } = await render(
    <PromiseBar promise={promise({ courseId: null })} sessions={[]} nowMs={NOW} weekStart="monday" />,
  );
  expect(found).toContain('◔');
  await act(async () => { tree.unmount(); });
});

it('ticks the TickBar ratio up when a session is inserted', async () => {
  const first = await render(
    <PromiseBar promise={promise()} sessions={[]} nowMs={NOW} weekStart="monday" emoji="📘" />,
  );
  expect(first.found).toContain('0/60');
  expect(findTickBar(first.tree).props.progress).toBe(0);
  await act(async () => { first.tree.unmount(); });

  const second = await render(
    <PromiseBar promise={promise()} sessions={[session(45)]} nowMs={NOW} weekStart="monday" emoji="📘" />,
  );
  expect(second.found).toContain('45/60');
  expect(findTickBar(second.tree).props.progress).toBe(0.75);
  await act(async () => { second.tree.unmount(); });
});

it('floors the done display and caps the ratio at 1', async () => {
  // 45.9 would display 46 if rounded — floor shows 45.
  const floored = await render(
    <PromiseBar promise={promise()} sessions={[session(45.9)]} nowMs={NOW} weekStart="monday" emoji="📘" />,
  );
  expect(floored.found).toContain('45/60');
  await act(async () => { floored.tree.unmount(); });

  const capped = await render(
    <PromiseBar promise={promise()} sessions={[session(90)]} nowMs={NOW} weekStart="monday" emoji="📘" />,
  );
  expect(capped.found).toContain('90/60');
  expect(findTickBar(capped.tree).props.progress).toBe(1);
  await act(async () => { capped.tree.unmount(); });
});
