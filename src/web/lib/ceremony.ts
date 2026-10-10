/**
 * The feel of a button press: a haptic tick and a soft click-and-chime.
 * Everything here is best effort and fails silently.
 */
import { prefs } from "./prefs.svelte.ts";

/* ---- Haptics ------------------------------------------------------------ */

const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

const isAppleTouch =
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1));

let switchLabel: HTMLLabelElement | null = null;

/**
 * Safari on iOS has no Vibration API, but since iOS 18 toggling a native
 * `<input type="checkbox" switch>` plays the system haptic. This is a
 * workaround Apple could remove; when it stops working, nothing breaks.
 */
function appleHaptic() {
  if (!switchLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = "daymark-haptic";
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    switchLabel = document.createElement("label");
    switchLabel.htmlFor = input.id;
    switchLabel.setAttribute("aria-hidden", "true");
    for (const el of [input, switchLabel]) {
      el.style.position = "fixed";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      el.style.width = "1px";
      el.style.height = "1px";
      el.style.left = "-100px";
    }
    document.body.append(input, switchLabel);
  }
  switchLabel.click();
}

export const hapticsSupported = canVibrate || isAppleTouch;

export function haptic(pattern: number | number[] = 12) {
  if (!prefs.haptics) return;
  try {
    if (canVibrate) navigator.vibrate(pattern);
    else if (isAppleTouch) appleHaptic();
  } catch {
    // ignore
  }
}

/* ---- Sound -------------------------------------------------------------- */

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

/** A soft mechanical "thock" followed by a gentle two-note chime. Synthesised, no audio files. */
export function pressSound() {
  if (!prefs.sound) return;
  const ctx = context();
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(ctx.destination);

  // Thock: a short sine with a fast pitch drop.
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(220, t);
  body.frequency.exponentialRampToValueAtTime(70, t + 0.08);
  bodyGain.gain.setValueAtTime(0.0001, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  body.connect(bodyGain).connect(out);
  body.start(t);
  body.stop(t + 0.14);

  // Chime: two soft bell tones.
  for (const [freq, delay] of [
    [880, 0.07],
    [1318.5, 0.15],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = t + delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + 0.65);
  }
}

/** Everything that happens the instant a button is pressed. */
export function celebrate() {
  haptic(12);
  pressSound();
}
