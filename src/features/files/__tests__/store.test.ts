import { StoredFile } from '@/db/schema';
import { useFilesStore } from '../store';

jest.mock('../queries', () => ({
  listAllFiles: jest.fn(),
  listFilesByCourse: jest.fn(),
  getFileById: jest.fn(),
  insertFile: jest.fn(),
  deleteFileRow: jest.fn(),
}));
jest.mock('../storage', () => ({
  deleteSandboxFile: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  listAllFiles: jest.Mock;
  listFilesByCourse: jest.Mock;
  getFileById: jest.Mock;
  insertFile: jest.Mock;
  deleteFileRow: jest.Mock;
};
const storage = jest.requireMock('../storage') as { deleteSandboxFile: jest.Mock };

const row: StoredFile = {
  id: 'f1', courseId: 'c1', category: 'materials', name: 'syllabus.pdf',
  sandboxUri: 'file:///vault/f1.pdf', size: 2048, mime: 'application/pdf',
  description: null, addedAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useFilesStore.setState({ all: [], loadedAll: false, byCourse: {} });
  queries.listAllFiles.mockResolvedValue([row]);
  queries.listFilesByCourse.mockResolvedValue([row]);
  queries.getFileById.mockResolvedValue(row);
  queries.insertFile.mockResolvedValue(row);
  queries.deleteFileRow.mockResolvedValue(undefined);
});

it('refreshAll loads every file and marks loaded', async () => {
  await useFilesStore.getState().refreshAll();
  const s = useFilesStore.getState();
  expect(s.all).toEqual([row]);
  expect(s.loadedAll).toBe(true);
});

it('refreshAll marks loaded even when the read fails', async () => {
  queries.listAllFiles.mockRejectedValue(new Error('db locked'));
  await useFilesStore.getState().refreshAll();
  expect(useFilesStore.getState().loadedAll).toBe(true);
  expect(useFilesStore.getState().all).toEqual([]);
});

it('refreshCourse caches under the course id without disturbing other courses', async () => {
  useFilesStore.setState({ byCourse: { other: [] } });
  await useFilesStore.getState().refreshCourse('c1');
  expect(useFilesStore.getState().byCourse).toEqual({ other: [], c1: [row] });
});

it('add inserts, then refreshes the global list and the course cache', async () => {
  const created = await useFilesStore.getState().add({
    courseId: 'c1', category: 'materials', name: 'syllabus.pdf',
    sandboxUri: 'file:///vault/f1.pdf', size: 2048, mime: 'application/pdf',
  });
  expect(created).toEqual(row);
  expect(queries.listAllFiles).toHaveBeenCalledTimes(1);
  expect(queries.listFilesByCourse).toHaveBeenCalledWith('c1');
});

it('add skips the course refresh for a courseless file', async () => {
  await useFilesStore.getState().add({
    courseId: null, category: 'other', name: 'misc.txt',
    sandboxUri: 'file:///vault/f2.txt', size: 10, mime: 'text/plain',
  });
  expect(queries.listFilesByCourse).not.toHaveBeenCalled();
});

it('remove deletes the on-disk file, the row, then refreshes', async () => {
  await useFilesStore.getState().remove('f1');
  expect(queries.getFileById).toHaveBeenCalledWith('f1');
  expect(storage.deleteSandboxFile).toHaveBeenCalledWith('file:///vault/f1.pdf');
  expect(queries.deleteFileRow).toHaveBeenCalledWith('f1');
  expect(queries.listAllFiles).toHaveBeenCalledTimes(1);
  expect(queries.listFilesByCourse).toHaveBeenCalledWith('c1');
});

it('remove tolerates a row that is already gone', async () => {
  queries.getFileById.mockResolvedValue(null);
  await expect(useFilesStore.getState().remove('ghost')).resolves.toBeUndefined();
  expect(storage.deleteSandboxFile).not.toHaveBeenCalled();
});
