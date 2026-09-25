export const colors = {
  paper: '#F4F1EA',
  paper2: '#EBE6DA',
  ink: '#141414',
  ink70: '#4A4A4A',
  ink40: '#8C8C8C',
  ink15: '#D9D4C7',
  black: '#000000',
  white: '#FFFFFF',
  danger: '#C8352A',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 4, md: 8, lg: 16, pill: 999 } as const;
export const fontFamilies = {
  body: 'BricolageGrotesque',
  mono: 'ShareTechMono',
  clock: 'Doto',
  lcd: 'DSEG7',
  stamp: 'DotGothic16',
  heading: 'Orbitron',
  pixel: 'VT323',
} as const;
export const hardShadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
} as const;
