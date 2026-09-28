import { isSoundEnabled, playSound, setSoundEnabled } from '../index';
const mockPlay = jest.fn();
const mockSeekTo = jest.fn(() => Promise.resolve());
const mockCreateAudioPlayer = jest.fn((..._a: unknown[]) => ({ play: mockPlay, seekTo: mockSeekTo }));
jest.mock('expo-audio', () => ({ createAudioPlayer: (...a: unknown[]) => mockCreateAudioPlayer(...a) }));

beforeEach(() => { jest.clearAllMocks(); setSoundEnabled(true); });

it('plays a sound, creating its player once and reusing it', () => {
  playSound('tick');
  playSound('tick');
  expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  expect(mockPlay).toHaveBeenCalledTimes(2);
  expect(mockSeekTo).toHaveBeenCalledWith(0);
});

it('is silent when disabled', () => {
  setSoundEnabled(false);
  expect(isSoundEnabled()).toBe(false);
  playSound('done');
  expect(mockPlay).not.toHaveBeenCalled();
});

it('swallows player failures', () => {
  mockCreateAudioPlayer.mockImplementationOnce(() => { throw new Error('no audio route'); });
  expect(() => playSound('pop')).not.toThrow();
});
