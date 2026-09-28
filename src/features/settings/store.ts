import { create } from 'zustand';
import { refreshReminders } from '@/features/reminders/refresh';
import { setSoundEnabled } from '@/lib/sound';
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
    try {
      const stored = await readAllSettings();
      const merged = { ...DEFAULT_SETTINGS, ...stored } as Settings;
      setSoundEnabled(merged.sound_enabled);
      set({ settings: merged, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  set: async (key, value) => {
    const previous = get().settings;
    if (key === 'sound_enabled') setSoundEnabled(value as boolean);
    set({ settings: { ...previous, [key]: value } });
    try {
      await writeSetting(key, value);
    } catch {
      if (key === 'sound_enabled') setSoundEnabled(previous.sound_enabled);
      set({ settings: previous });
    }
    // Settings feed reminder planning (default lead) — funnel every write rather
    // than key-matching, so a lead change reschedules notifications immediately.
    void refreshReminders().catch(() => {});
  },
}));

export const useSettings = () => useSettingsStore((s) => s.settings);
