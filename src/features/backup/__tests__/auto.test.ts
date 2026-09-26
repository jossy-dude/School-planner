import { runAutoBackup } from '../auto';

jest.mock('../exporter', () => ({ exportBackup: jest.fn() }));
jest.mock('@/features/settings/queries', () => ({ readAllSettings: jest.fn() }));

const { exportBackup } = jest.requireMock('../exporter') as { exportBackup: jest.Mock };
const { readAllSettings } = jest.requireMock('@/features/settings/queries') as { readAllSettings: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  exportBackup.mockResolvedValue(undefined);
  readAllSettings.mockResolvedValue({});
});

it('backs up silently on first open when backup_last_at has never been set', async () => {
  await runAutoBackup();

  expect(exportBackup).toHaveBeenCalledTimes(1);
  expect(exportBackup).toHaveBeenCalledWith({ silent: true });
});

it('waits for the interval before backing up again', async () => {
  const day = 86_400_000;
  readAllSettings.mockResolvedValue({ backup_last_at: Date.now() - 6 * day, backup_interval_days: 7 });

  await runAutoBackup();

  expect(exportBackup).not.toHaveBeenCalled();
});

it('backs up once the interval has elapsed', async () => {
  const day = 86_400_000;
  readAllSettings.mockResolvedValue({ backup_last_at: Date.now() - 7 * day, backup_interval_days: 7 });

  await runAutoBackup();

  expect(exportBackup).toHaveBeenCalledWith({ silent: true });
});

it('honours a custom interval from settings', async () => {
  const day = 86_400_000;
  readAllSettings.mockResolvedValue({ backup_last_at: Date.now() - 2 * day, backup_interval_days: 1 });

  await runAutoBackup();

  expect(exportBackup).toHaveBeenCalledTimes(1);
});

it('never throws when settings cannot be read', async () => {
  readAllSettings.mockRejectedValue(new Error('db closed'));

  await expect(runAutoBackup()).resolves.toBeUndefined();

  expect(exportBackup).not.toHaveBeenCalled();
});
