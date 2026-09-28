export type Settings = {
  reminder_lead_default_min: number;
  study_goal_min: number;
  week_start: 'sunday' | 'monday';
  gpa_scale_id: string | null;
  gpa_rounding: number;
  gpa_excluded: string[];
  backup_interval_days: number;
  backup_last_at: number | null;
};

export const DEFAULT_SETTINGS: Settings = {
  reminder_lead_default_min: 60,
  study_goal_min: 120,
  week_start: 'monday',
  gpa_scale_id: null,
  gpa_rounding: 2,
  gpa_excluded: [],
  backup_interval_days: 7,
  backup_last_at: null,
};

export function mergeSettings(base: Settings, patch: Record<string, unknown>): Settings {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[k];
    if (typeof def === 'number' && typeof v === 'number') (out as Record<string, unknown>)[k] = v;
    else if (typeof def === 'string' && typeof v === 'string') (out as Record<string, unknown>)[k] = v;
    else if (Array.isArray(def) && Array.isArray(v)) (out as Record<string, unknown>)[k] = v;
    else if (def === null && (v === null || typeof v === 'number' || typeof v === 'string')) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
