const SOUND_URL = "/audio/wooden-dice-wuzzy.mp3";

let clip: HTMLAudioElement | null = null;

/** Starts the recording. Call this from a click. A failure does not change the roll. */
export function playDiceSound(): Promise<void> {
  stopDiceSound();
  if (typeof Audio === "undefined") return Promise.reject(new Error("Audio is unavailable"));
  clip = clip ?? new Audio(SOUND_URL);
  clip.volume = 0.8;
  clip.currentTime = 0;
  return clip.play().then(() => undefined);
}

export function stopDiceSound(): void {
  if (!clip) return;
  clip.pause();
  clip.currentTime = 0;
}
