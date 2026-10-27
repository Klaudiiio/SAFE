const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export const API_BASE_URL = configuredApiUrl ?? "";
export const apiConfigured = Boolean(API_BASE_URL);

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
};

type CsrfResponse = {
  csrf_token?: string;
};

function getErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    const messages = Object.values(record)
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value): value is string => typeof value === "string");
    if (messages.length) return messages.join(" ");
  }
  return `Request failed (HTTP ${status}).`;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!apiConfigured) {
    throw new Error(
      "Set EXPO_PUBLIC_API_URL in expo-native/.env to your computer's LAN address (for example, http://192.168.1.20:8000).",
    );
  }

  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  if (method !== "GET") {
    const csrfResponse = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
      credentials: "include",
    });
    const csrfPayload = (await readPayload(csrfResponse)) as CsrfResponse | null;
    if (!csrfResponse.ok || !csrfPayload?.csrf_token) {
      throw new Error("Could not start a secure request. Check that the SAFE API is available.");
    }
    headers["X-CSRFToken"] = csrfPayload.csrf_token;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }
  if (response.status === 204) return undefined as T;
  return payload as T;
}
