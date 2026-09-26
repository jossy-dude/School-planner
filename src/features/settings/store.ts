import { create } from 'zustand';
import { refreshReminders } from '@/features/reminders/refresh';
import { DEFAULT_SETTINGS, Settings } from './logic';
import { readAllSettings, writeSetting } from './queries';

interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,
  hydrate: async () => {
    const stored = await readAllSettings();
    set({ settings: { ...DEFAULT_SETTINGS, ...stored } as Settings, hydrated: true });
  },
  set: async (key, value) => {
    set({ settings: { ...get().settings, [key]: value } });
    await writeSetting(key, value);
    // Settings feed reminder planning (default lead) — funnel every write rather
    // than key-matching, so a lead change reschedules notifications immediately.
    void refreshReminders().catch(() => {});
  },
}));

export const useSettings = () => useSettingsStore((s) => s.settings);
