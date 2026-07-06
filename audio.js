/**
 * Audio Synthesizer for Phone Chat Game Engine (Disabled/Silent Mode)
 * Stubbed out to remove sound functionality for the time being.
 */

class AudioController {
  constructor() {
    this.enabled = false;
  }

  init() {}
  resume() {}
  toggle(enabled) {}
  playReceive() {}
  playSend() {}
  playTypeTick() {}
  playVibrate() {}
  playClick() {}
}

export const audio = new AudioController();
