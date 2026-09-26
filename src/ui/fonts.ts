import { useFonts, BricolageGrotesque_400Regular, BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { Doto_600SemiBold, Doto_900Black } from '@expo-google-fonts/doto';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { Orbitron_500Medium } from '@expo-google-fonts/orbitron';
import { VT323_400Regular } from '@expo-google-fonts/vt323';

export const FONTS = {
  // Alias families: keys match tokens `fontFamilies` values exactly
  BricolageGrotesque: BricolageGrotesque_400Regular,
  ShareTechMono: ShareTechMono_400Regular,
  Doto: Doto_600SemiBold,
  Orbitron: Orbitron_500Medium,
  VT323: VT323_400Regular,
  DSEG7: require('../../assets/fonts/DSEG7Classic-Regular.ttf'),
  DotGothic16: require('../../assets/fonts/DotGothic16-Regular.ttf'),
  // Weight variants under their package names (explicit fontWeight / iOS use)
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  Doto_600SemiBold,
  Doto_900Black,
  ShareTechMono_400Regular,
  Orbitron_500Medium,
  VT323_400Regular,
  // Local TTFs
  DSEG7Classic: require('../../assets/fonts/DSEG7Classic-Regular.ttf'),
  DSEG14Classic: require('../../assets/fonts/DSEG14Classic-Regular.ttf'),
} as const;

export function fontsReady(loaded: boolean, error: Error | null): boolean {
  // A load error must not block boot: fall back to system fonts instead of
  // parking the app on the splash spinner forever.
  return loaded || error !== null;
}

export function useFontsLoaded(): boolean {
  const [loaded, error] = useFonts(FONTS);
  return fontsReady(loaded, error);
}
