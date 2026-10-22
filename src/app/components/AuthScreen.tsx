import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, GraduationCap, LogIn, ShieldCheck, UserRound } from "lucide-react";

export interface AuthenticatedUser {
  id: number;
  email: string;
  display_name: string;
  account_type: "student" | "visitor";
  verification_status: string;
}

interface DemoAuthConfig {
  demo_mode: boolean;
}

interface AuthScreenProps {
  apiBaseUrl: string;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

type AuthMode = "login" | "signup";
type AccountType = "student" | "visitor";

interface AuthApiPayload {
  detail?: unknown;
  password_errors?: string[];
  csrf_token?: string;
  user?: AuthenticatedUser;
}

async function readAuthApiPayload(response: Response): Promise<AuthApiPayload> {
  const responseText = await response.text();
  if (!responseText) return {};

  try {
    const payload: unknown = JSON.parse(responseText);
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as AuthApiPayload;
    }
  } catch {
    return {};
  }

  return {};
}

function getApiErrorMessage(payload: AuthApiPayload): string | undefined {
  if (Array.isArray(payload.password_errors)) {
    const messages = payload.password_errors.filter((item): item is string => typeof item === "string");
    if (messages.length) return messages.join(" ");
  }
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (Array.isArray(payload.detail)) {
    const messages = payload.detail.filter((item): item is string => typeof item === "string");
    if (messages.length) return messages.join(" ");
  }
  return undefined;
}

export function AuthScreen({ apiBaseUrl, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState<DemoAuthConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/api/auth/demo-config/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load demo account settings.");
        return response.json();
      })
      .then((data: DemoAuthConfig) => setConfig(data))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setConfigError(error instanceof Error ? error.message : "Could not load demo account settings.");
      });

    return () => controller.abort();
  }, [apiBaseUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (mode === "signup" && !displayName.trim()) {
      setFormError("Enter your display name to create the demo account.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Enter a valid email address, such as student@example.test.");
      return;
    }
    if (!password) {
      setFormError("Enter your password.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setFormError("Choose a password with at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfResponse = await fetch(`${apiBaseUrl}/api/auth/csrf/`, { credentials: "include" });
      const csrfPayload = await readAuthApiPayload(csrfResponse);
      if (!csrfResponse.ok || !csrfPayload.csrf_token) {
        throw new Error(csrfResponse.status === 403
          ? "Security check expired. Reload SAFE and try again."
          : "Could not reach the secure sign-in service. Check that Django is running and retry.");
      }
      const endpoint = mode === "login" ? "login" : "signup";
      const body = mode === "login"
        ? { email, password }
        : {
            display_name: displayName,
            email,
            password,
            account_type: accountType,
          };
      const response = await fetch(`${apiBaseUrl}/api/auth/${endpoint}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfPayload.csrf_token,
        },
        body: JSON.stringify(body),
      });
      const result = await readAuthApiPayload(response);
      if (!response.ok) {
        const detail = getApiErrorMessage(result);
        if (detail) throw new Error(detail);
        if (response.status === 409) {
          throw new Error("An account with this email already exists. Choose Sign in instead.");
        }
        if (response.status === 403 && mode === "signup") {
          throw new Error(config?.demo_mode === false
            ? "Demo sign-up is disabled. Enable DEBUG in Django's backend settings, restart the backend, and reload SAFE."
            : "Django rejected this device's security check. Add the exact SAFE address on your phone (including http:// and :5173) to CSRF_TRUSTED_ORIGINS in backend/.env, restart Django, and reload SAFE.");
        }
        if (response.status >= 500) {
          throw new Error(`The sign-in service failed (HTTP ${response.status}). Check the Django terminal for details.`);
        }
        throw new Error(`The server returned an unexpected response (HTTP ${response.status}). Check that Django is running.`);
      }
      setPassword("");
      if (!result.user) throw new Error("The server did not return an account. Reload SAFE and try again.");
      onAuthenticated(result.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      if (message === "Failed to fetch") {
        setFormError("Can’t reach the SAFE server. Check that Django and Vite are running, then retry.");
      } else if (message.toLowerCase().includes("did not match the expected pattern")) {
        setFormError("The sign-in request could not be sent. Check that your email address and server URL are valid, then retry.");
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="size-full overflow-y-auto" style={{ background: "radial-gradient(ellipse at 18% 12%, rgba(127,29,29,0.22), transparent 36%), #080A0F", color: "#F0F4FF", fontFamily: "Inter, sans-serif" }}>
      <div className="mx-auto grid min-h-full w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <section className="hidden lg:block">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(220,38,38,0.14)", border: "1px solid rgba(220,38,38,0.3)" }}>
            <ShieldCheck size={28} color="#EF4444" />
          </div>
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em" }}>SAFE · DEMO ACCESS</p>
          <h1 className="mt-4 max-w-lg" style={{ fontSize: "clamp(36px, 4vw, 54px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.04em" }}>
            A safer response starts here.
          </h1>
          <p className="mt-5 max-w-md" style={{ color: "#91A0B8", fontSize: "15px", lineHeight: 1.7 }}>
            Sign in to access your SAFE reports, or create a demo account to explore the experience.
          </p>
          <div className="mt-10 flex max-w-md flex-col gap-4">
            {[
              ["01", "Private account access", "Your reports stay associated with your account."],
              ["02", "Simple incident reporting", "Keep your report history together in one place."],
              ["03", "Demo environment", "Use fictional details; this prototype does not verify identity."],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-4 rounded-2xl p-4" style={{ background: "rgba(14,17,23,0.78)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>{number}</span>
                <div>
                  <h2 style={{ color: "#E4EAF4", fontSize: "13px", fontWeight: 700 }}>{title}</h2>
                  <p className="mt-1" style={{ color: "#7A8FAD", fontSize: "11px", lineHeight: 1.5 }}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <header className="mb-6 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(220,38,38,0.14)", border: "1px solid rgba(220,38,38,0.3)" }}>
              <ShieldCheck size={24} color="#EF4444" />
            </div>
            <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em" }}>SAFE · DEMO ACCESS</p>
          </header>

          <div className="rounded-3xl p-5 sm:p-7" style={{ background: "rgba(14,17,23,0.94)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)" }}>
            <header className="mb-6">
              <h1 style={{ fontSize: "25px", fontWeight: 800, letterSpacing: "-0.03em" }}>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
              <p className="mt-2" style={{ color: "#91A0B8", fontSize: "13px", lineHeight: 1.5 }}>
                {mode === "login" ? "Sign in to view and submit your reports." : "Set up a demo account with your email and password."}
              </p>
            </header>

            <div className="mb-5 grid grid-cols-2 rounded-xl p-1" style={{ background: "#080A0F", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["login", "signup"] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  aria-pressed={mode === nextMode}
                  onClick={() => { setMode(nextMode); setFormError(""); }}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
                  style={{ color: mode === nextMode ? "#FFFFFF" : "#7A8FAD", background: mode === nextMode ? "#252B35" : "transparent" }}
                >
                  {nextMode === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <>
                  <label className="flex flex-col gap-2">
                    <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Account type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(["student", "visitor"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setAccountType(type); setFormError(""); }}
                          className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold"
                          style={{ background: accountType === type ? "rgba(239,68,68,0.12)" : "#0E1117", border: `1px solid ${accountType === type ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`, color: accountType === type ? "#FCA5A5" : "#AAB8CE" }}
                        >
                          {type === "student" ? <GraduationCap size={16} /> : <UserRound size={16} />}
                          {type === "student" ? "Student" : "Visitor"}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Fictional display name</span>
                    <input required maxLength={100} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Demo Student" className="rounded-xl px-3 py-3 outline-none" style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F4FF" }} />
                  </label>
                </>
              )}

              <label className="flex flex-col gap-2">
                <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Demo email</span>
                <input required type="text" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.test" className="rounded-xl px-3 py-3 outline-none" style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F4FF" }} />
              </label>

              <label className="flex flex-col gap-2">
                <span style={{ color: "#AAB8CE", fontSize: "12px", fontWeight: 600 }}>Password</span>
                <input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} className="rounded-xl px-3 py-3 outline-none" style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F4FF" }} />
              </label>

              {(formError || configError) && (
                <div role="alert" aria-live="polite" className="rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5", fontSize: "12px", lineHeight: 1.5 }}>
                  {formError || configError}
                </div>
              )}

              <button type="submit" disabled={isSubmitting || (mode === "signup" && config?.demo_mode === false)} className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "#B91C1C", color: "#FFFFFF" }}>
                {mode === "login" ? <LogIn size={17} /> : <UserRound size={17} />}
                {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="mt-5 flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <AlertTriangle size={15} color="#EAB308" className="mt-0.5 shrink-0" />
              <p style={{ color: "#D8C98C", fontSize: "11px", lineHeight: 1.5 }}>
                Prototype only. Signup does not verify USTP enrollment or government ID. Use fictional accounts and data only.
              </p>
            </div>
          </div>

          {config?.demo_mode && mode === "signup" && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center" style={{ color: "#4A5F7A", fontSize: "10px" }}>
              <ShieldCheck size={12} /> Demo signups are enabled only while Django DEBUG is on.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
