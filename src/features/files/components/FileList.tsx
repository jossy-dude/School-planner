import { View } from 'react-native';
import { StoredFile } from '@/db/schema';
import { EmptyState } from '@/ui/primitives';
import { FileRow } from './FileRow';

export function FileList({ files, loaded, onOpen, onDelete }: {
  files: StoredFile[];
  loaded: boolean;
  onOpen: (file: StoredFile) => void;
  onDelete: (file: StoredFile) => void;
}) {
  if (files.length === 0) {
    return <EmptyState glyph="▤" label={loaded ? 'no files yet' : 'loading…'} />;
  }
  return (
    <View style={{ gap: 8 }}>
      {files.map((file) => (
        <FileRow key={file.id} file={file} onOpen={() => onOpen(file)} onDelete={() => onDelete(file)} />
      ))}
    </View>
  );
}
