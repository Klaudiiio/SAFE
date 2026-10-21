import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Step1_Trigger } from "./components/Step1_Trigger";
import { Step2_Incident, IncidentType } from "./components/Step2_Incident";
import { Step3_Report, ReportData } from "./components/Step3_Report";
import { Step4_Recording } from "./components/Step4_Recording";
import { Step5_Sent } from "./components/Step5_Sent";
import { AccountTab, AppTab, AppTabBar, ReportHistory } from "./components/AppTabs";
import { AuthScreen, AuthenticatedUser } from "./components/AuthScreen";

type Step = 1 | 2 | 3 | 4 | 5;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/api/auth/me/`, { credentials: "include", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => setCurrentUser(payload?.user ?? null))
      .catch((error: unknown) => {
        if (!(error instanceof Error && error.name === "AbortError")) setCurrentUser(null);
      })
      .finally(() => setAuthChecked(true));

    return () => controller.abort();
  }, [apiBaseUrl]);

  const handleAuthenticated = (user: AuthenticatedUser) => {
    setCurrentUser(user);
    setAuthChecked(true);
  };

  const handleLogout = async () => {
    const csrfResponse = await fetch(`${apiBaseUrl}/api/auth/csrf/`, { credentials: "include" });
    if (!csrfResponse.ok) throw new Error("Could not start a secure sign-out request.");
    const csrfPayload = await csrfResponse.json();
    const response = await fetch(`${apiBaseUrl}/api/auth/logout/`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRFToken": csrfPayload.csrf_token },
    });
    if (!response.ok) throw new Error("Could not sign out. Please try again.");
    setCurrentUser(null);
    handleReset();
  };

  const handleReset = () => {
    setStep(1);
    setSelectedIncident(null);
    setReportData(null);
    setSubmissionError(null);
  };

  const submitReportToBackend = async () => {
    if (!selectedIncident || !reportData) return false;

    setSubmissionError(null);

    try {
      const csrfResponse = await fetch(`${apiBaseUrl}/api/auth/csrf/`, { credentials: "include" });
      if (!csrfResponse.ok) throw new Error("Could not start a secure report submission.");
      const csrfPayload = await csrfResponse.json();
      const response = await fetch(`${apiBaseUrl}/api/reports/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfPayload.csrf_token,
        },
        body: JSON.stringify({
          incident_id: selectedIncident.id,
          incident_label: selectedIncident.label,
          severity: selectedIncident.severity,
          building: reportData.building || "Unknown",
          floor: reportData.floor || "Unknown",
          description: reportData.description || "",
          recording_notice_accepted: reportData.recordingNoticeAccepted,
          audio_enabled: reportData.audioEnabled,
          video_enabled: reportData.videoEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      console.info("SAFE report saved to backend:", payload);
      setHistoryRefreshKey((key) => key + 1);
      return true;
    } catch (error) {
      console.error("Could not save report to backend:", error);
      setSubmissionError(error instanceof Error ? error.message : "The report could not be saved.");
      return false;
    }
  };

  return (
    <div
      className="size-full flex flex-col overflow-hidden"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {!authChecked ? (
        <div className="flex size-full items-center justify-center" style={{ color: "#7A8FAD" }}>
          Checking sign-in...
        </div>
      ) : !currentUser ? (
        <AuthScreen apiBaseUrl={apiBaseUrl} onAuthenticated={handleAuthenticated} />
      ) : (
      <>
      <main
        className="flex-1 min-h-0"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))", boxSizing: "border-box" }}
      >
        <div className="size-full" style={{ display: activeTab === "home" ? "block" : "none" }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                className="size-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Step1_Trigger onActivate={() => setStep(2)} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                className="size-full"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Step2_Incident
                  onSelect={(incident) => {
                    setSelectedIncident(incident);
                    setStep(3);
                  }}
                  onBack={() => setStep(1)}
                />
              </motion.div>
            )}

            {step === 3 && selectedIncident && (
              <motion.div
                key="step3"
                className="size-full"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Step3_Report
                  incident={selectedIncident}
                  onContinue={(data) => {
                    setReportData(data);
                    setStep(4);
                  }}
                  onBack={() => setStep(2)}
                />
              </motion.div>
            )}

            {step === 4 && selectedIncident && reportData && (
              <motion.div
                key="step4"
                className="size-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Step4_Recording
                  incident={selectedIncident}
                  reportData={reportData}
                  onComplete={async () => {
                    if (await submitReportToBackend()) setStep(5);
                  }}
                />
              </motion.div>
            )}

            {step === 5 && selectedIncident && reportData && (
              <motion.div
                key="step5"
                className="size-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Step5_Sent
                  incident={selectedIncident}
                  reportData={reportData}
                  onReset={handleReset}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {activeTab === "history" && <ReportHistory apiBaseUrl={apiBaseUrl} refreshKey={historyRefreshKey} />}
        {activeTab === "account" && <AccountTab user={currentUser} onLogout={handleLogout} />}
      </main>
      <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
      {submissionError && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.78)" }}
        >
          <section
            role="alertdialog"
            aria-labelledby="submission-error-title"
            aria-describedby="submission-error-description"
            className="w-full max-w-md rounded-2xl p-5"
            style={{ background: "#0E1117", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <h2 id="submission-error-title" style={{ color: "#FCA5A5", fontSize: "18px", fontWeight: 700 }}>
              Report not saved
            </h2>
            <p id="submission-error-description" className="mt-2 break-words" style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.5 }}>
              {submissionError}. Your report details are still available to retry.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (await submitReportToBackend()) setStep(5);
                }}
                className="rounded-xl px-4 py-3 font-semibold"
                style={{ background: "#B91C1C", color: "#FFFFFF" }}
              >
                Retry submission
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.05)", color: "#C8D6F0" }}
              >
                Discard and start over
              </button>
            </div>
          </section>
        </div>
      )}
      </>
      )}
    </div>
  );
}
