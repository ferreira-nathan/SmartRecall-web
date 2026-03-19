'use client';

import { useAppStore } from './store';
import type { SoundName } from './store';

const SOUND_FILES: Record<SoundName, string> = {
  correct: '/sounds/correct.mp3',
  incorrect: '/sounds/incorrect.mp3',
  streak: '/sounds/streak.mp3',
  'session-complete': '/sounds/session-complete.mp3',
  'level-up': '/sounds/level-up.mp3',
  flip: '/sounds/flip.mp3',
};

// Cache audio instances
const audioCache = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName): HTMLAudioElement {
  if (!audioCache.has(name)) {
    const audio = new Audio(SOUND_FILES[name]);
    audio.preload = 'auto';
    audio.volume = 0.5;
    audioCache.set(name, audio);
  }
  return audioCache.get(name)!;
}

export function playSound(name: SoundName): void {
  const { soundEnabled } = useAppStore.getState();
  if (!soundEnabled) return;

  try {
    const audio = getAudio(name);
    // Reset to start if already playing
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Silently fail if audio can't play (e.g., no user interaction yet)
    });
  } catch {
    // Silently fail
  }
}

export function preloadSounds(): void {
  Object.keys(SOUND_FILES).forEach((name) => {
    getAudio(name as SoundName);
  });
}
