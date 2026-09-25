import { create } from 'zustand';
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
  },
}));

export const useSettings = () => useSettingsStore((s) => s.settings);
