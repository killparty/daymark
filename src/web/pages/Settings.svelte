<script lang="ts">
  import * as v from "valibot";
  import { ExportFile, type ImportResult, type WeekStart } from "../../shared/api.ts";
  import PageHeader from "../components/PageHeader.svelte";
  import { api } from "../lib/api.ts";
  import { hapticsSupported, haptic, pressSound } from "../lib/ceremony.ts";
  import { localeWeekStart, WEEKDAY_NAMES } from "../lib/format.ts";
  import { prefs, type Theme } from "../lib/prefs.svelte.ts";
  import { app } from "../lib/store.svelte.ts";

  const themes: { value: Theme; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  const dayNames = WEEKDAY_NAMES("long");
  const weekStarts: { value: WeekStart; label: string }[] = [
    { value: "auto", label: `Automatic (${dayNames[localeWeekStart()]})` },
    { value: "mon", label: dayNames[1] ?? "Monday" },
    { value: "sun", label: dayNames[0] ?? "Sunday" },
    { value: "sat", label: dayNames[6] ?? "Saturday" },
  ];

  let importing = $state(false);
  let importResult = $state<ImportResult | null>(null);
  let importError = $state<string | null>(null);
  let fileInput: HTMLInputElement;

  async function onImport(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    importing = true;
    importResult = null;
    importError = null;
    try {
      const parsed = v.safeParse(ExportFile, JSON.parse(await file.text()));
      if (!parsed.success) throw new Error("This doesn't look like a Daymark export file.");
      importResult = await api.importData(parsed.output);
      await app.reloadAll();
    } catch (err) {
      importError = err instanceof Error ? err.message : String(err);
    } finally {
      importing = false;
      fileInput.value = "";
    }
  }
</script>

<PageHeader title="Settings" />

<section>
  <h2 class="section-title">Appearance</h2>
  <div class="card">
    <ul class="list">
      <li>
        <span class="grow">Theme</span>
        <div class="segmented" role="radiogroup" aria-label="Theme">
          {#each themes as t}
            <button role="radio" aria-checked={prefs.theme === t.value} onclick={() => (prefs.theme = t.value)}>
              {t.label}
            </button>
          {/each}
        </div>
      </li>
      <li>
        <label class="grow" for="week-start">Week starts on</label>
        <select
          id="week-start"
          value={app.me?.settings.weekStart ?? "auto"}
          onchange={(e) => app.updateSettings({ weekStart: e.currentTarget.value as WeekStart })}
        >
          {#each weekStarts as w}
            <option value={w.value}>{w.label}</option>
          {/each}
        </select>
      </li>
    </ul>
  </div>
</section>

<section>
  <h2 class="section-title">Button feel <span class="note">on this device</span></h2>
  <div class="card">
    <ul class="list">
      <li>
        <label class="grow" for="sound">
          Sound
          <span class="muted small block">A soft click when you mark an activity</span>
        </label>
        <input
          id="sound"
          type="checkbox"
          role="switch"
          checked={prefs.sound}
          onchange={(e) => {
            prefs.sound = e.currentTarget.checked;
            if (prefs.sound) pressSound();
          }}
        />
      </li>
      <li>
        <label class="grow" for="haptics">
          Haptics
          <span class="muted small block">
            {hapticsSupported ? "A short vibration when you press" : "Not supported by this browser"}
          </span>
        </label>
        <input
          id="haptics"
          type="checkbox"
          role="switch"
          checked={prefs.haptics}
          disabled={!hapticsSupported}
          onchange={(e) => {
            prefs.haptics = e.currentTarget.checked;
            if (prefs.haptics) haptic(12);
          }}
        />
      </li>
    </ul>
  </div>
</section>

<section>
  <h2 class="section-title">Data</h2>
  <div class="card pad">
    <p class="muted small">
      Your data is yours. Export everything as JSON (can be imported again) or the entries as CSV
      for spreadsheets.
    </p>
    <div class="row">
      <a class="btn" href="/api/v1/export" download>Export JSON</a>
      <a class="btn" href="/api/v1/export.csv" download>Export CSV</a>
      <button class="btn" disabled={importing} onclick={() => fileInput.click()}>
        {importing ? "Importing…" : "Import JSON"}
      </button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={onImport} />
    </div>
    <p class="muted small">
      Importing adds what's missing and never changes or removes anything you already have.
    </p>
    {#if importResult}
      <p role="status">
        Imported {importResult.activitiesAdded} activities and {importResult.entriesAdded} entries
        {#if importResult.entriesSkipped}({importResult.entriesSkipped} already there){/if}.
      </p>
    {/if}
    {#if importError}<p class="error" role="alert">{importError}</p>{/if}
  </div>
</section>

<section>
  <h2 class="section-title">About</h2>
  <div class="card pad small muted">
    <p>
      Daymark {__APP_VERSION__} · signed in as {app.me?.name ?? "…"}
      {#if app.me?.authMode === "none"}(no login; keep this server on a private network){/if}
    </p>
    <p>Times are shown in {app.timeZone.replaceAll("_", " ")}.</p>
  </div>
</section>

<style>
  section {
    margin-bottom: 28px;
  }
  .grow {
    flex: 1;
  }
  .block {
    display: block;
  }
  .note {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
  }
  .pad {
    padding: 4px 16px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  select {
    min-height: 40px;
    padding: 0 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--card-raised);
  }
  input[type="checkbox"] {
    width: 22px;
    height: 22px;
    accent-color: var(--c-green);
  }
  .error {
    color: var(--danger);
  }
</style>
