// The mock factory must bypass jest's module registry: requiring the mock file
// by path resolves back to the 'expo-sqlite' mock id and recurses infinitely.
jest.mock('expo-sqlite', () => jest.requireActual('@/db/__mocks__/expo-sqlite'));
// react-native-worklets ships a native TurboModule that cannot run under Jest;
// its package-provided mock keeps react-native-reanimated importable.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
