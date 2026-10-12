import type {
  Activity,
  Change,
  CreateActivityBody,
  Entry,
  ExportFile,
  ImportResult,
  LogResult,
  Me,
  Revision,
  UpdateActivityBody,
  UserSettings,
} from "../../shared/api.ts";
import type { IsoDate } from "../../shared/dates.ts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      // Always JSON: the server's CSRF check rejects form-like requests.
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? "error",
      data?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export const api = {
  me: () => request<Me>("GET", "/me"),
  revision: () => request<Revision>("GET", "/revision"),
  updateSettings: (patch: Partial<UserSettings>) =>
    request<UserSettings>("PATCH", "/me/settings", patch),

  activities: () => request<Activity[]>("GET", "/activities"),
  createActivity: (body: CreateActivityBody) => request<Activity>("POST", "/activities", body),
  updateActivity: (id: string, body: UpdateActivityBody) =>
    request<Activity>("PATCH", `/activities/${id}`, body),
  archiveActivity: (id: string) => request<Activity>("POST", `/activities/${id}/archive`),
  unarchiveActivity: (id: string) => request<Activity>("POST", `/activities/${id}/unarchive`),
  reorderActivities: (ids: string[]) => request<Activity[]>("PUT", "/activities/order", { ids }),

  log: (activityId: string, timeZone: string) =>
    request<LogResult>("POST", "/entries", { activityId, timeZone }),
  entries: (from: IsoDate, to: IsoDate) =>
    request<Entry[]>("GET", `/entries?from=${from}&to=${to}`),
  removeEntry: (id: string) => request<void>("DELETE", `/entries/${id}`),

  changes: (before?: string) =>
    request<Change[]>("GET", `/changes?limit=50${before ? `&before=${before}` : ""}`),
  revertChange: (id: string) => request<Change>("POST", `/changes/${id}/revert`),

  importData: (file: ExportFile) => request<ImportResult>("POST", "/import", file),
};
