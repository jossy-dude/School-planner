import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import {
  attendance,
  courses,
  events,
  files,
  gpaScales,
  gradeCategories,
  grades,
  notes,
  scheduleExceptions,
  schedulePatterns,
  settings,
  studyPromises,
  studySessions,
  terms,
} from '@/db/schema';

export type BackupTableName =
  | 'terms'
  | 'courses'
  | 'schedulePatterns'
  | 'scheduleExceptions'
  | 'gradeCategories'
  | 'grades'
  | 'attendance'
  | 'events'
  | 'studySessions'
  | 'studyPromises'
  | 'files'
  | 'notes'
  | 'gpaScales'
  | 'settings';

// Order here is the export/gather order (parents first, so payloads read naturally).
export const TABLES: Record<BackupTableName, SQLiteTable> = {
  terms,
  courses,
  schedulePatterns,
  scheduleExceptions,
  gradeCategories,
  grades,
  attendance,
  events,
  studySessions,
  studyPromises,
  files,
  notes,
  gpaScales,
  settings,
};

// Pinned FK order — DELETE children first (drops in the wrong order would cascade
// or null rows out from under us before we reached them).
export const DELETE_ORDER: BackupTableName[] = [
  'grades',
  'gradeCategories',
  'scheduleExceptions',
  'schedulePatterns',
  'attendance',
  'events',
  'studySessions',
  'studyPromises',
  'files',
  'notes',
  'courses',
  'terms',
  'gpaScales',
  'settings',
];

// Pinned FK order — INSERT parents first (children reference existing rows).
export const INSERT_ORDER: BackupTableName[] = [
  'terms',
  'courses',
  'schedulePatterns',
  'scheduleExceptions',
  'gradeCategories',
  'grades',
  'attendance',
  'events',
  'studySessions',
  'studyPromises',
  'files',
  'notes',
  'gpaScales',
  'settings',
];
