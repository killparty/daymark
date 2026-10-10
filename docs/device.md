# The Daymark device (planned)

A small desk object: an e-paper screen showing the calendar, with a row of real, colored buttons on
top — one per activity, matching the web buttons 1:1. Pressing one marks the activity for today.
Nothing is built yet; this page collects the plan so the server is ready for it.

## Principles

- **The device is a thin client.** The server keeps all data and rules. The device sends presses and
  shows a picture.
- **The server renders the screen.** The device downloads a ready-made 1-bit (or few-color) image of
  the calendar sized for its panel. Layout changes need no firmware update. (TRMNL and Inkplate work
  this way.)
- **Instant feedback comes from the hardware**, not the screen: e-paper takes 1–3 s to refresh, so the
  satisfying part is a good mechanical switch, an LED in the button, maybe a buzzer or haptic motor.
- **Offline-safe.** If WiFi or the server is down, the device queues presses with their time and
  sends them later. The API is idempotent per day, so replays are harmless.

## Hardware direction

- **ESP32 (e.g. ESP32-S3) rather than a Raspberry Pi Zero**: wakes from deep sleep on a button press
  in milliseconds, months on a battery, no SD card to corrupt. Boards like LilyGo T5, Waveshare ESP32
  e-paper drivers or Soldered Inkplate bundle board and screen.
- **Display**: black-and-white e-paper is cheap and fast; activities are told apart by icon, not
  color ([ADR 0006](adr/0006-color-and-icon-keys.md)). Six-color panels (e.g. Spectra 6) can show the
  real colors but refresh slowly (~15–30 s).
- **Buttons**: four to start (e.g. 24 mm arcade buttons, colored to match). The first N activities in
  the web app's order are mapped to the N buttons.

## Server additions (when the hardware exists)

- `devices` table: `id, user_id, name, token_hash, timezone, last_seen_at`. A device belongs to one
  user. Tokens are created and revoked in Settings.
- Routes under `/api/v1/device/*`, authenticated with `Authorization: Bearer <token>`, bypassing proxy
  SSO:
  - `GET  /api/v1/device/state` → activities mapped to buttons, today's done-state, a screen version.
  - `POST /api/v1/device/press` → `{ button, pressedAt, idempotencyKey }`. `pressedAt` lets queued
    presses land on the right day; the server accepts it only within a short window.
  - `GET  /api/v1/device/screen.png?w=…&h=…&colors=…` → the rendered calendar image (Satori + resvg
    to turn a component into a bitmap).
- Entries from the device get `source = "device:<id>"`.
