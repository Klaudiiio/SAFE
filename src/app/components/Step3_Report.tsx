import { useState } from "react";
import { motion } from "motion/react";
import { Video, ArrowLeft, AlertTriangle, Clock } from "lucide-react";
import { IncidentType } from "./Step2_Incident";

interface Step3Props {
  incident: IncidentType;
  onContinue: (data: ReportData) => void;
  onBack: () => void;
}

export interface ReportData {
  incidentId: string;
  incidentLabel: string;
  severity: "urgent" | "minor";
  building: string;
  floor: string;
  description: string;
  recordingNoticeAccepted: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function Step3_Report({ incident, onContinue, onBack }: Step3Props) {
  const [accepted, setAccepted] = useState(false);
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [description, setDescription] = useState("");
  const isUrgent = incident.severity === "urgent";
  const accentColor = isUrgent ? "#EF4444" : "#22C55E";

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handleContinue = () => {
    if (!accepted) return;

    onContinue({
      incidentId: incident.id,
      incidentLabel: incident.label,
      severity: incident.severity,
      building,
      floor,
      description,
      recordingNoticeAccepted: true,
      audioEnabled: true,
      videoEnabled: true,
    });
  };

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 lg:px-10 py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8FAD" }}
        >
          <ArrowLeft size={15} />
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "11px" }}>Back</span>
        </button>
        <div>
          <p style={{ color: accentColor, fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em" }}>
            STEP 2 OF 4
          </p>
          <h2 style={{ color: "#F0F4FF", fontSize: "clamp(14px, 2vw, 20px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Recording Notice
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-full"
              style={{
                width: n <= 2 ? "24px" : "8px",
                height: "8px",
                background: n <= 2 ? accentColor : "rgba(255,255,255,0.12)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content — centered single column */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 lg:px-10 py-8">
        <div className="w-full max-w-xl flex flex-col gap-5">

          {/* Incident badge */}
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{
              background: isUrgent ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.07)",
              border: `1px solid ${isUrgent ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}`,
            }}
          >
            <AlertTriangle size={18} color={accentColor} className="shrink-0 mt-0.5" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.08em" }}>
                SELECTED INCIDENT
              </p>
              <p style={{ color: "#F0F4FF", fontSize: "15px", fontWeight: 700, marginTop: "3px" }}>
                {incident.label}
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "3px", lineHeight: 1.5 }}>
                {incident.signs}
              </p>
            </div>
          </div>

          {/* Recording notice card */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: "#0E1117", border: "1px solid rgba(234,179,8,0.25)" }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}
                animate={{ boxShadow: ["0 0 0 0 rgba(234,179,8,0.3)", "0 0 0 10px rgba(234,179,8,0)", "0 0 0 0 rgba(234,179,8,0)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Video size={22} color="#EAB308" />
              </motion.div>
              <div>
                <p style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em" }}>
                  ⚠ RECORDING NOTICE
                </p>
                <p style={{ color: "#F0F4FF", fontSize: "15px", fontWeight: 700 }}>
                  You are about to be recorded
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[
                "Your audio and video will be captured for this emergency report.",
                "This recording will be immediately transmitted to the school emergency response team.",
                "All recordings are securely stored and accessible only to authorized personnel.",
                "This session is logged with your timestamp, incident type, and device information.",
                "False or frivolous reports may result in disciplinary action.",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#EAB308" }} />
                  <p style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <div
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Clock size={13} color="#7A8FAD" />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
                Report initiated: {timeStr} · {dateStr}
              </span>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              style={{ color: "#C8D6F0" }}
            >
              <label className="flex flex-col gap-2 text-left">
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>BUILDING</span>
                <input
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  placeholder="Main Hall"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", padding: "10px 12px", borderRadius: "12px" }}
                />
              </label>
              <label className="flex flex-col gap-2 text-left">
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>FLOOR / ROOM</span>
                <input
                  value={floor}
                  onChange={(event) => setFloor(event.target.value)}
                  placeholder="2nd Floor / 204"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", padding: "10px 12px", borderRadius: "12px" }}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-left">
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>DETAILS</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, the condition of the student, and any actions already taken."
                rows={4}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F4FF", padding: "12px", borderRadius: "12px", resize: "vertical" }}
              />
            </label>

            {/* Acknowledgment checkbox */}
            <button
              className="flex items-start gap-3 text-left"
              onClick={() => setAccepted(!accepted)}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: accepted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${accepted ? "#EF4444" : "rgba(255,255,255,0.15)"}`,
                  transition: "all 0.2s",
                }}
              >
                {accepted && (
                  <span style={{ color: "#EF4444", fontSize: "11px", fontWeight: 700 }}>✓</span>
                )}
              </div>
              <p style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.6 }}>
                I understand and acknowledge that this emergency report will be recorded, logged, and transmitted to school authorities.
              </p>
            </button>
          </div>

          {/* Continue button */}
          <motion.button
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
            style={{
              background: accepted
                ? isUrgent
                  ? "linear-gradient(135deg, #DC2626, #7F1D1D)"
                  : "linear-gradient(135deg, #16A34A, #14532D)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${accepted ? accentColor : "rgba(255,255,255,0.07)"}`,
              cursor: accepted ? "pointer" : "not-allowed",
              opacity: accepted ? 1 : 0.5,
            }}
            whileTap={accepted ? { scale: 0.98 } : {}}
          >
            <Video size={18} color={accepted ? "#fff" : "#4A5F7A"} />
            <span style={{ color: accepted ? "#fff" : "#4A5F7A", fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em" }}>
              START RECORDING
            </span>
          </motion.button>

          {!accepted && (
            <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px", textAlign: "center" }}>
              Accept the recording notice above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
