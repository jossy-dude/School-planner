import { db, migrateNow } from '../index';

jest.mock('expo-sqlite', () => {
  const actual = jest.requireActual('@/db/__mocks__/expo-sqlite');
  return {
    ...actual,
    openDatabaseSync: () => {
      throw new Error('disk corrupt');
    },
  };
});

it('surfaces an unopenable database through migrateNow instead of crashing at import', async () => {
  await expect(migrateNow()).rejects.toThrow('disk corrupt');
  expect(() => db.select).toThrow('disk corrupt');
});
