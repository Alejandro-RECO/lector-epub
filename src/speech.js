/**
 * speech.js - Text-to-Speech manager using Web Speech API
 */

class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.utterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.selectedVoice = null;
    this.listeners = new Set();

    if (this.synth) {
      this.initVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  isSupported() {
    return !!this.synth;
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize Spanish voices if available, or system default
    const esVoice = voices.find(v => v.lang.startsWith('es') || v.lang.startsWith('es-'));
    this.selectedVoice = esVoice || voices[0] || null;
  }

  getVoices() {
    return this.synth ? this.synth.getVoices() : [];
  }

  setVoice(voiceURI) {
    const voices = this.getVoices();
    this.selectedVoice = voices.find(v => v.voiceURI === voiceURI) || this.selectedVoice;
  }

  setRate(rate) {
    this.rate = parseFloat(rate) || 1.0;
    if (this.isPlaying && !this.isPaused) {
      // Restart current utterance with new rate
      const currentText = this.utterance ? this.utterance.text : '';
      if (currentText) {
        this.stop();
        this.speak(currentText);
      }
    }
  }

  speak(text) {
    if (!this.synth || !text) return;

    this.stop();

    // Clean text of extra whitespaces/code artifacts
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    if (!cleanedText) return;

    this.utterance = new SpeechSynthesisUtterance(cleanedText);
    if (this.selectedVoice) {
      this.utterance.voice = this.selectedVoice;
    }
    this.utterance.rate = this.rate;
    this.utterance.pitch = this.pitch;

    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notify({ state: 'playing' });
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.notify({ state: 'stopped' });
    };

    this.utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this.isPlaying = false;
      this.isPaused = false;
      this.notify({ state: 'stopped' });
    };

    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.notify({ state: 'paused' });
    }
  }

  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.notify({ state: 'playing' });
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.notify({ state: 'stopped' });
    }
  }

  toggle(text) {
    if (this.isPlaying) {
      if (this.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
    } else {
      this.speak(text);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(data) {
    this.listeners.forEach(fn => fn(data));
  }
}

export const speechManager = new SpeechManager();
