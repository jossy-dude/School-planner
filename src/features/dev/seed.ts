import { Directory, File, Paths } from 'expo-file-system';
import { db } from '@/db';
import { courses, StoredFile } from '@/db/schema';
import { applyTables } from '@/features/backup/apply';
import { sandboxFileName } from '@/features/files/logic';
import { buildSampleTables, SAMPLE_FILES } from './sampleData';

// Sample rows reference real vault files by sandboxUri, so the bytes have to be
// on disk before the transaction runs — otherwise every Vault card opens to a
// missing file.
function writeSampleFiles(now: Date): StoredFile[] {
  const dir = new Directory(Paths.document, 'vault');
  if (!dir.exists) dir.create({ intermediates: true });
  return SAMPLE_FILES.map((spec, index) => {
    const dest = new File(dir, sandboxFileName(spec.id, spec.name));
    dest.write(spec.body);
    return {
      id: spec.id,
      courseId: spec.courseId,
      category: spec.category,
      name: spec.name,
      sandboxUri: dest.uri,
      size: dest.size ?? spec.body.length,
      mime: 'text/plain',
      description: spec.description,
      addedAt: new Date(now.getTime() - (SAMPLE_FILES.length - index) * 3_600_000),
      updatedAt: now,
    };
  });
}

// Replaces everything with the demo semester — same transaction and store
// refresh path as a backup import, so the UI updates in place.
export async function loadSampleData(): Promise<boolean> {
  const now = new Date();
  const files = writeSampleFiles(now);
  return applyTables(buildSampleTables(now, files));
}

// Dev-only: seeds a brand-new database on first launch so the app opens full
// instead of into a wall of empty states. Never runs once a course exists.
export async function autoSeedIfEmpty(): Promise<boolean> {
  if (!__DEV__) return false;
  try {
    const existing = await db.select({ id: courses.id }).from(courses).limit(1);
    if (existing.length > 0) return false;
  } catch {
    return false;
  }
  return loadSampleData();
}
