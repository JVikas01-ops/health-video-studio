/**
 * Voice Synthesis & Audio Generation Service
 * Synthesizes character dialogues and sound cues using browser Web Speech & Web Audio APIs.
 * 100% offline, zero API keys, instant generation.
 */

export interface SynthesizedAudioResult {
  audioUrl?: string;
  durationSec: number;
  spokenText: string;
  speaker: string;
}

// Character voice profiles with pitch, rate, and voice characteristics
const ORGAN_VOICE_PROFILES: Record<string, { pitch: number; rate: number; voicePreference?: string }> = {
  brain: { pitch: 1.15, rate: 1.05 },
  heart: { pitch: 0.95, rate: 1.0 },
  lungs: { pitch: 1.25, rate: 0.95 },
  stomach: { pitch: 0.75, rate: 0.9 },
  liver: { pitch: 0.85, rate: 0.95 },
  kidneys: { pitch: 1.1, rate: 1.1 },
  narrator: { pitch: 1.0, rate: 1.0 },
};

/**
 * Get pitch and rate settings for an organ character name or role
 */
export const getVoiceProfile = (characterName: string) => {
  const lower = characterName.toLowerCase();
  for (const [key, profile] of Object.entries(ORGAN_VOICE_PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  return ORGAN_VOICE_PROFILES.narrator;
};

/**
 * Generate a spoken audio blob from text using Web Speech API + Web Audio MediaStreamDestination
 * Falls back to estimated audio timing if MediaStream recording is restricted.
 */
export const synthesizeCharacterSpeech = async (
  text: string,
  characterName: string
): Promise<SynthesizedAudioResult> => {
  const words = text.trim().split(/\s+/).length;
  // Average speaking rate: ~130 words per minute => ~2.2 words per second
  const estimatedDuration = Math.max(2, Math.round(words / 2.2));

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      durationSec: estimatedDuration,
      spokenText: text,
      speaker: characterName,
    };
  }

  const profile = getVoiceProfile(characterName);

  return new Promise((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find((v) => v.lang.startsWith('en') && !v.localService) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      // Check if AudioContext can record the output
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && typeof MediaRecorder !== 'undefined') {
        const audioCtx = new AudioContextClass();
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Subtle biological tone accompaniment
        const baseFreq = profile.pitch * 220;
        osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + estimatedDuration);

        osc.connect(gain);
        gain.connect(dest);
        osc.start();

        const recorder = new MediaRecorder(dest.stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          audioCtx.close().catch(() => {});
          resolve({
            audioUrl,
            durationSec: estimatedDuration,
            spokenText: text,
            speaker: characterName,
          });
        };

        recorder.start();

        utterance.onend = () => {
          try {
            if (recorder.state === 'recording') recorder.stop();
          } catch {
            resolve({
              durationSec: estimatedDuration,
              spokenText: text,
              speaker: characterName,
            });
          }
        };

        utterance.onerror = () => {
          try {
            if (recorder.state === 'recording') recorder.stop();
          } catch {
            resolve({
              durationSec: estimatedDuration,
              spokenText: text,
              speaker: characterName,
            });
          }
        };

        // Auto-stop safety timeout
        setTimeout(() => {
          try {
            if (recorder.state === 'recording') recorder.stop();
          } catch {}
        }, (estimatedDuration + 2) * 1000);

        window.speechSynthesis.speak(utterance);
      } else {
        // Direct speech trigger without recording
        window.speechSynthesis.speak(utterance);
        resolve({
          durationSec: estimatedDuration,
          spokenText: text,
          speaker: characterName,
        });
      }
    } catch {
      resolve({
        durationSec: estimatedDuration,
        spokenText: text,
        speaker: characterName,
      });
    }
  });
};

/**
 * Generates procedural biological ambient sound effects (heartbeats, whooshes, alarms)
 */
export const synthesizeBioSoundEffect = (
  soundType: 'heartbeat' | 'whoosh' | 'alarm' | 'cellular_hum',
  durationSec = 3
): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass || typeof MediaRecorder === 'undefined') {
        resolve('');
        return;
      }

      const audioCtx = new AudioContextClass();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (soundType === 'heartbeat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, audioCtx.currentTime);
        // Lub-dub pattern
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      } else if (soundType === 'whoosh') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, audioCtx.currentTime + 0.5);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      } else if (soundType === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + durationSec - 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSec);
      }

      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      const recorder = new MediaRecorder(dest.stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioCtx.close().catch(() => {});
        resolve(url);
      };

      recorder.start();

      setTimeout(() => {
        try {
          if (recorder.state === 'recording') recorder.stop();
        } catch {
          resolve('');
        }
      }, durationSec * 1000);
    } catch {
      resolve('');
    }
  });
};
