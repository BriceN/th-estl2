import { Injectable } from '@angular/core';

interface AudioObject {
  audio: HTMLAudioElement;
  promise: Promise<void>;
  resolve?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class AudioManagerService {
  private audioObjects: Map<string, AudioObject> = new Map();
  private basePath: string = '/audio/sounds/';

  constructor() {}

  /**
   * Play a sound file with optional looping
   * @param soundName - Name of the sound file (e.g., 'bg.mp3')
   * @param shouldLoop - Whether the sound should loop (default: false)
   * @returns Promise that resolves when the sound ends (or when stopped for looping sounds)
   */
  play(soundName: string, shouldLoop: boolean = false): Promise<void> {
    const soundUrl = this.basePath + soundName;

    // If the sound is already playing, return its existing promise
    if (this.audioObjects.has(soundName)) {
      const audioObj = this.audioObjects.get(soundName);
      if (audioObj && !audioObj.audio.paused) {
        return audioObj.promise;
      }
    }

    const audio = new Audio(soundUrl);
    audio.loop = shouldLoop;

    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const audioObject: AudioObject = {
      audio: audio,
      promise: promise,
      resolve: resolvePromise!,
    };

    // For non-looping sounds, resolve when the sound ends
    if (!shouldLoop) {
      audio.addEventListener('ended', () => {
        resolvePromise!();
        this.audioObjects.delete(soundName);
      });
    }

    this.audioObjects.set(soundName, audioObject);

    audio.play().catch((error) => {
      console.error(`Error playing sound ${soundName}:`, error);
      resolvePromise!();
      this.audioObjects.delete(soundName);
    });

    return promise;
  }

  /**
   * Stop a specific sound
   * @param soundName - Name of the sound file
   */
  stop(soundName: string): void {
    const audioObj = this.audioObjects.get(soundName);
    if (audioObj) {
      audioObj.audio.pause();
      audioObj.audio.currentTime = 0;
      // Resolve the promise for looping sounds
      if (audioObj.resolve) {
        audioObj.resolve();
      }
      this.audioObjects.delete(soundName);
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    this.audioObjects.forEach((audioObj, soundName) => {
      audioObj.audio.pause();
      audioObj.audio.currentTime = 0;
      // Resolve the promise for any pending sounds
      if (audioObj.resolve) {
        audioObj.resolve();
      }
    });
    this.audioObjects.clear();
  }

  /**
   * Play multiple sounds simultaneously
   * @param sounds - Array of sound names to play
   * @param shouldLoop - Whether the sounds should loop (default: false)
   * @returns Promise that resolves when all non-looping sounds finish
   */
  playMultiple(sounds: string[], shouldLoop: boolean = false): Promise<void> {
    const promises: Promise<void>[] = [];

    sounds.forEach((soundName) => {
      const promise = this.play(soundName, shouldLoop);
      promises.push(promise);
    });

    return Promise.all(promises).then(() => {});
  }

  /**
   * Pause a specific sound (keeps the current time position)
   * @param soundName - Name of the sound file
   */
  pause(soundName: string): void {
    const audioObj = this.audioObjects.get(soundName);
    if (audioObj) {
      audioObj.audio.pause();
    }
  }

  /**
   * Resume a paused sound
   * @param soundName - Name of the sound file
   */
  resume(soundName: string): void {
    const audioObj = this.audioObjects.get(soundName);
    if (audioObj) {
      audioObj.audio.play().catch((error) => {
        console.error(`Error resuming sound ${soundName}:`, error);
      });
    }
  }

  /**
   * Set volume for a specific sound
   * @param soundName - Name of the sound file
   * @param volume - Volume level (0 to 1)
   */
  setVolume(soundName: string, volume: number): void {
    const audioObj = this.audioObjects.get(soundName);
    if (audioObj) {
      audioObj.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set global volume for all sounds
   * @param volume - Volume level (0 to 1)
   */
  setGlobalVolume(volume: number): void {
    this.audioObjects.forEach((audioObj) => {
      audioObj.audio.volume = Math.max(0, Math.min(1, volume));
    });
  }

  /**
   * Check if a sound is currently playing
   * @param soundName - Name of the sound file
   * @returns boolean - Whether the sound is playing
   */
  isPlaying(soundName: string): boolean {
    const audioObj = this.audioObjects.get(soundName);
    return audioObj ? !audioObj.audio.paused : false;
  }

  /**
   * Pause all currently playing sounds
   */
  pauseAll(): void {
    this.audioObjects.forEach((audioObj) => {
      if (!audioObj.audio.paused) {
        audioObj.audio.pause();
      }
    });
  }

  /**
   * Resume all paused sounds
   */
  resumeAll(): void {
    this.audioObjects.forEach((audioObj, soundName) => {
      if (audioObj.audio.paused) {
        audioObj.audio.play().catch((error) => {
          console.error(`Error resuming sound ${soundName}:`, error);
        });
      }
    });
  }
}
