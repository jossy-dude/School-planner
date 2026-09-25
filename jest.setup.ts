// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('expo-sqlite', () => require('./src/db/__mocks__/expo-sqlite'));
// react-native-worklets ships a native TurboModule that cannot run under Jest;
// its package-provided mock keeps react-native-reanimated importable.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
