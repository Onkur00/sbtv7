/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

export function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  } catch (e) {
    console.warn("Web Audio API not supported in this browser:", e);
  }
}

export async function playBeep(type: 'move' | 'select' = 'move') {
  if (!audioCtx) {
    initAudio();
  }
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(err => console.warn("Failed to resume AudioContext:", err));
  }
  if (audioCtx.state !== 'running') return;

  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  const osc = audioCtx.createOscillator();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'move') {
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else {
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export function ensureSound() {
  if (!audioCtx) initAudio();
  playBeep('move').catch(e => console.warn(e));
}
