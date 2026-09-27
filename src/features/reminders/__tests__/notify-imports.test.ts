import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIRS = [path.join(__dirname, '../../..'), path.join(__dirname, '../../../../app')];

const ROOT_IMPORT =
  /from\s*['"]expo-notifications['"]|import\s*\(\s*['"]expo-notifications['"]\s*\)|require\s*\(\s*['"]expo-notifications['"]\s*\)|import\s*['"]expo-notifications['"]/;

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

it('never imports the expo-notifications package root', () => {
  const offenders: string[] = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(dir)) {
      if (ROOT_IMPORT.test(fs.readFileSync(file, 'utf8'))) offenders.push(path.relative(dir, file));
    }
  }
  expect(offenders).toEqual([]);
});
