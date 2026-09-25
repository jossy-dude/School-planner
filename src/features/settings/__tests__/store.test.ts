import { DEFAULT_SETTINGS, mergeSettings } from '../logic';
import { useSettingsStore } from '../store';

jest.mock('../queries', () => ({
  readAllSettings: jest.fn(),
  writeSetting: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  readAllSettings: jest.Mock;
  writeSetting: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: false });
});

it('ships the spec defaults', () => {
  expect(DEFAULT_SETTINGS.reminder_lead_default_min).toBe(60);
  expect(DEFAULT_SETTINGS.week_start).toBe('monday');
  expect(DEFAULT_SETTINGS.backup_interval_days).toBe(7);
  expect(DEFAULT_SETTINGS.gpa_rounding).toBe(2);
  expect(DEFAULT_SETTINGS.study_goal_min).toBe(120);
});

it('merge ignores unknown keys and wrong types', () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, { reminder_lead_default_min: 15, bogus: 1, study_goal_min: 'high' } as never);
  expect(merged.reminder_lead_default_min).toBe(15);
  expect('bogus' in merged).toBe(false);
  expect(merged.study_goal_min).toBe(DEFAULT_SETTINGS.study_goal_min);
});

it('set writes through and hydrate re-reads stored values over defaults', async () => {
  queries.writeSetting.mockResolvedValue(undefined);
  await useSettingsStore.getState().set('study_goal_min', 90);
  expect(queries.writeSetting).toHaveBeenCalledWith('study_goal_min', 90);
  expect(useSettingsStore.getState().settings.study_goal_min).toBe(90);

  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: false });
  queries.readAllSettings.mockResolvedValue({ study_goal_min: 90, week_start: 'sunday' });
  await useSettingsStore.getState().hydrate();

  const s = useSettingsStore.getState();
  expect(s.settings.study_goal_min).toBe(90);
  expect(s.settings.week_start).toBe('sunday');
  expect(s.settings.reminder_lead_default_min).toBe(DEFAULT_SETTINGS.reminder_lead_default_min);
  expect(s.hydrated).toBe(true);
});
