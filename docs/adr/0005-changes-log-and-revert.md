# 0005 — Once per day, soft deletes and a revertible Changes log

**Status:** accepted

## Context

A press must be simple and final; a second press must never undo it. Mistakes still happen
(wrong button, a child pressing buttons), and the user wants full control to fix them — including
undoing a fix.

## Decision

- A partial unique index enforces **one live entry per (user, activity, date)**. Logging again
  returns the existing entry (`201` the first time, `200` afterwards).
- Removing an entry sets `deleted_at` (soft delete). Activities are **archived**, never deleted;
  their history stays visible in the calendar.
- Every change (logged, removed, restored, activity created/edited/archived/restored/reordered,
  import) is written to `changes` in the same transaction, with enough data to describe and reverse
  it.
- **Revert** applies the opposite change through the normal service functions and records it as a
  new change pointing at the original (`data.reverts`); the original gets `reverted_at`. A change can
  be reverted once; the revert itself can be reverted. Imports are not revertible (yet).

## Consequences

- The Changes page is a complete, readable history.
- Reverts can conflict with later changes (e.g. restoring an entry when the activity was logged again
  that day); the API answers `409` with a clear message.
- The audit log grows forever; at a few rows per day this is negligible.
