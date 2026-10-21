import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Step1_Trigger } from "./components/Step1_Trigger";
import { Step2_Incident, IncidentType } from "./components/Step2_Incident";
import { Step3_Report, ReportData } from "./components/Step3_Report";
import { Step4_Recording } from "./components/Step4_Recording";
import { Step5_Sent } from "./components/Step5_Sent";
import { AccountTab, AppTab, AppTabBar, ReportHistory } from "./components/AppTabs";

type Step = 1 | 2 | 3 | 4 | 5;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "";

  const handleReset = () => {
    setStep(1);
    setSelectedIncident(null);
    setReportData(null);
  };

  const submitReportToBackend = async () => {
    if (!selectedIncident || !reportData) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    } catch (error) {
      console.error("Could not save report to backend:", error);
    }
  };

  return (
    <div
      className="size-full flex flex-col overflow-hidden"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
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
                    await submitReportToBackend();
                    setStep(5);
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
        {activeTab === "account" && <AccountTab />}
      </main>
      <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
