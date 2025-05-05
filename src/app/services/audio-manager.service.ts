import { Injectable } from '@angular/core';

interface AudioObject {
  audio: HTMLAudioElement;
  promise: Promise<void>;
  resolve?: () => void;
  fadeTimeoutId?: ReturnType<typeof setTimeout>;
  targetVolume: number; // The volume this audio should play at
}

interface AudioOptions {
  shouldLoop?: boolean;
  shouldFade?: boolean;
  fadeDuration?: number; // in milliseconds
  volume?: number; // in 0-1 range
}

@Injectable({
  providedIn: 'root',
})
export class AudioManagerService {
  private audioObjects: Map<string, AudioObject> = new Map();
  private basePath: string = '/audio/sounds/';
  private defaultFadeDuration: number = 500; // 500ms default fade

  constructor() {}

  /**
   * Play a sound file with optional looping, fading and volume
   * @param soundName - Name of the sound file (e.g., 'bg.mp3')
   * @param shouldLoop - Whether the sound should loop (default: false)
   * @param shouldFade - Whether to fade in the sound (default: true)
   * @param fadeDuration - Duration of the fade in milliseconds (default: 500)
   * @param volume - Initial volume (0-1, default: 1)
   * @returns Promise that resolves when the sound ends (or when stopped for looping sounds)
   */
  play(
    soundName: string,
    shouldLoop: boolean = false,
    shouldFade: boolean = true,
    fadeDuration: number = this.defaultFadeDuration,
    volume: number = 1
  ): Promise<void> {
    const soundUrl = this.basePath + soundName;

    // Clamp volume between 0 and 1
    volume = Math.max(0, Math.min(1, volume));

    // If the sound is already playing, return its existing promise
    if (this.audioObjects.has(soundName)) {
      const audioObj = this.audioObjects.get(soundName);
      if (audioObj && !audioObj.audio.paused) {
        return audioObj.promise;
      }
    }

    const audio = new Audio(soundUrl);
    audio.loop = shouldLoop;

    // Set initial volume based on fade preference
    if (shouldFade) {
      audio.volume = 0;
    } else {
      audio.volume = volume;
    }

    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const audioObject: AudioObject = {
      audio: audio,
      promise: promise,
      resolve: resolvePromise!,
      targetVolume: volume,
    };

    // For non-looping sounds, resolve when the sound ends
    if (!shouldLoop) {
      audio.addEventListener('ended', () => {
        resolvePromise!();
        this.audioObjects.delete(soundName);
      });
    }

    this.audioObjects.set(soundName, audioObject);

    audio
      .play()
      .then(() => {
        if (shouldFade) {
          this.fadeIn(soundName, fadeDuration);
        }
      })
      .catch((error) => {
        console.error(`Error playing sound ${soundName}:`, error);
        resolvePromise!();
        this.audioObjects.delete(soundName);
      });

    return promise;
  }

  /**
   * Stop a specific sound with optional fade out
   * @param soundName - Name of the sound file
   * @param shouldFade - Whether to fade out before stopping (default: true)
   * @param fadeDuration - Duration of the fade in milliseconds (default: 500)
   * @returns Promise that resolves when the fade and stop are complete
   */
  stop(
    soundName: string,
    shouldFade: boolean = true,
    fadeDuration: number = this.defaultFadeDuration
  ): Promise<void> {
    const audioObj = this.audioObjects.get(soundName);
    if (!audioObj) {
      return Promise.resolve();
    }

    if (shouldFade && audioObj.audio.volume > 0) {
      return this.fadeOut(soundName, fadeDuration).then(() => {
        this._stopAudio(soundName);
      });
    } else {
      this._stopAudio(soundName);
      return Promise.resolve();
    }
  }

  /**
   * Internal method to actually stop the audio
   */
  private _stopAudio(soundName: string): void {
    const audioObj = this.audioObjects.get(soundName);
    if (audioObj) {
      audioObj.audio.pause();
      audioObj.audio.currentTime = 0;

      // Clear any fade timeouts
      if (audioObj.fadeTimeoutId) {
        clearTimeout(audioObj.fadeTimeoutId);
      }

      // Resolve the promise for looping sounds
      if (audioObj.resolve) {
        audioObj.resolve();
      }
      this.audioObjects.delete(soundName);
    }
  }

  /**
   * Stop all currently playing sounds with optional fade out
   * @param shouldFade - Whether to fade out before stopping (default: true)
   * @param fadeDuration - Duration of the fade in milliseconds (default: 500)
   */
  stopAll(
    shouldFade: boolean = true,
    fadeDuration: number = this.defaultFadeDuration
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    this.audioObjects.forEach((audioObj, soundName) => {
      promises.push(this.stop(soundName, shouldFade, fadeDuration));
    });
    return Promise.all(promises).then(() => {});
  }

  /**
   * Play multiple sounds simultaneously with optional fading and volume
   * @param sounds - Array of sound names to play
   * @param options - Audio options for all sounds
   */
  playMultiple(sounds: string[], options: AudioOptions = {}): Promise<void> {
    const {
      shouldLoop = false,
      shouldFade = true,
      fadeDuration = this.defaultFadeDuration,
      volume = 1,
    } = options;
    const promises: Promise<void>[] = [];

    sounds.forEach((soundName) => {
      const promise = this.play(
        soundName,
        shouldLoop,
        shouldFade,
        fadeDuration,
        volume
      );
      promises.push(promise);
    });

    return Promise.all(promises).then(() => {});
  }

  /**
   * Fade in a specific sound to its target volume
   * @param soundName - Name of the sound file
   * @param duration - Duration of the fade in milliseconds
   */
  private fadeIn(soundName: string, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const audioObj = this.audioObjects.get(soundName);
      if (!audioObj) {
        resolve();
        return;
      }

      const audio = audioObj.audio;
      const startVolume = 0;
      const targetVolume = audioObj.targetVolume;
      const steps = 20;
      const interval = duration / steps;
      let currentStep = 0;

      const fade = () => {
        if (currentStep <= steps) {
          const volume =
            startVolume + (targetVolume - startVolume) * (currentStep / steps);
          audio.volume = Math.min(volume, targetVolume);
          currentStep++;

          if (currentStep <= steps) {
            audioObj.fadeTimeoutId = setTimeout(fade, interval);
          } else {
            resolve();
          }
        }
      };

      fade();
    });
  }

  /**
   * Fade out a specific sound from its current volume to 0
   * @param soundName - Name of the sound file
   * @param duration - Duration of the fade in milliseconds
   */
  private fadeOut(soundName: string, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const audioObj = this.audioObjects.get(soundName);
      if (!audioObj) {
        resolve();
        return;
      }

      const audio = audioObj.audio;
      const startVolume = audio.volume;
      const targetVolume = 0;
      const steps = 20;
      const interval = duration / steps;
      let currentStep = 0;

      const fade = () => {
        if (currentStep <= steps) {
          const volume =
            startVolume - (startVolume - targetVolume) * (currentStep / steps);
          audio.volume = Math.max(volume, 0);
          currentStep++;

          if (currentStep <= steps) {
            audioObj.fadeTimeoutId = setTimeout(fade, interval);
          } else {
            resolve();
          }
        }
      };

      fade();
    });
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
      audioObj.targetVolume = audioObj.audio.volume; // Update target volume
    }
  }

  /**
   * Set global volume for all sounds
   * @param volume - Volume level (0 to 1)
   */
  setGlobalVolume(volume: number): void {
    this.audioObjects.forEach((audioObj) => {
      audioObj.audio.volume = Math.max(0, Math.min(1, volume));
      audioObj.targetVolume = audioObj.audio.volume; // Update target volume
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
