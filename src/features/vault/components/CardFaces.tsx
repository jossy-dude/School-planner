import { Text, View } from 'react-native';
import { Note, StoredFile } from '@/db/schema';
import { Stamp } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';
import { CATEGORY_LABEL, fileGlyph, formatFileSize } from '@/features/files/logic';

export function FileCardFace({ file }: { file: StoredFile }) {
  return (
    <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 30 }}>{fileGlyph(file.name)}</Text>
      <View style={{ gap: 4 }}>
        <Text numberOfLines={2} style={{ fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink }}>
          {file.name}
        </Text>
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
          {CATEGORY_LABEL[file.category]} · {formatFileSize(file.size)}
        </Text>
      </View>
    </View>
  );
}

export function NoteCardFace({ note }: { note: Note }) {
  return (
    <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
      <Stamp text={note.kind === 'teacher_said' ? 'SAID' : 'TIP'} />
      <Text numberOfLines={4} style={{ fontFamily: fontFamilies.body, fontSize: 14, color: colors.ink }}>
        {note.body}
      </Text>
    </View>
  );
}
