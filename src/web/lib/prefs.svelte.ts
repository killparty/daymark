/**
 * Per-device preferences, kept in localStorage: the same person may want
 * sound on their phone but not on their work laptop.
 */
export type Theme = "system" | "light" | "dark";

const KEY = "daymark.";

function read<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(KEY + name);
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(name: string, value: string) {
  try {
    localStorage.setItem(KEY + name, value);
  } catch {
    // Private mode or storage disabled: the preference lasts for this session only.
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

class Prefs {
  #theme = $state<Theme>(read("theme", ["system", "light", "dark"], "system"));
  #sound = $state(read("sound", ["on", "off"], "on") === "on");
  #haptics = $state(read("haptics", ["on", "off"], "on") === "on");

  get theme() {
    return this.#theme;
  }
  set theme(value: Theme) {
    this.#theme = value;
    write("theme", value);
    applyTheme(value);
  }

  get sound() {
    return this.#sound;
  }
  set sound(value: boolean) {
    this.#sound = value;
    write("sound", value ? "on" : "off");
  }

  get haptics() {
    return this.#haptics;
  }
  set haptics(value: boolean) {
    this.#haptics = value;
    write("haptics", value ? "on" : "off");
  }
}

export const prefs = new Prefs();

/** Small JSON values (e.g. the calendar filter) remembered on this device. */
export function loadLocal<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY + name);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(name: string, value: unknown) {
  write(name, JSON.stringify(value));
}
