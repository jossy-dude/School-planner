import { createAudioPlayer, AudioPlayer } from 'expo-audio';

// Tiny fire-and-forget sound layer. Players are created lazily and reused
// (rewind + play), and every failure is swallowed: a missing audio route or a
// muted device must never break the UI action that triggered the sound.
const SOURCES = {
  tick: require('../../../assets/sounds/tick.wav'),
  start: require('../../../assets/sounds/start.wav'),
  done: require('../../../assets/sounds/done.wav'),
  pop: require('../../../assets/sounds/pop.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  try {
    let player = players[name];
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players[name] = player;
    }
    void player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // ignore: sound is garnish
  }
}
