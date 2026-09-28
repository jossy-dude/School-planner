import { Text, View } from 'react-native';
import { StoredFile } from '@/db/schema';
import { BrutCard } from '@/ui/BrutCard';
import { colors, fontFamilies } from '@/ui/tokens';
import { CATEGORY_LABEL, fileGlyph, formatFileSize } from '../logic';

export function FileRow({ file, onOpen, onDelete }: {
  file: StoredFile;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <BrutCard onPress={onOpen} onLongPress={onDelete}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 22, color: colors.ink }}>{fileGlyph(file.name)}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink }}>
            {file.name}
          </Text>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
            {CATEGORY_LABEL[file.category]} · {formatFileSize(file.size)}
          </Text>
          {file.description !== null && file.description !== '' && (
            <Text numberOfLines={1} style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink70 }}>
              {file.description}
            </Text>
          )}
        </View>
      </View>
    </BrutCard>
  );
}
