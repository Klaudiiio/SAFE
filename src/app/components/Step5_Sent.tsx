import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle, Clock, AlertTriangle, Phone, Shield, Users, Heart, RefreshCw, ChevronRight } from "lucide-react";
import { IncidentType } from "./Step2_Incident";
import { ReportData } from "./Step3_Report";

interface Step5Props {
  incident: IncidentType;
  reportData: ReportData;
  onReset: () => void;
}

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function ElapsedTimer({ startTime }: { startTime: Date }) {
  const now = useTime();
  const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  return <>{min > 0 ? `${min}m ` : ""}{sec}s ago</>;
}

const URGENT_STEPS = [
  { icon: Shield, color: "#EF4444", bg: "rgba(239,68,68,0.12)", title: "Do NOT move the person", detail: "Unless there is immediate danger (fire, structural collapse). Keep them still and calm." },
  { icon: Heart, color: "#F97316", bg: "rgba(249,115,22,0.12)", title: "Check breathing & pulse", detail: "If unresponsive and not breathing normally, begin CPR if you are trained. Call out for an AED." },
  { icon: Users, color: "#0EA5E9", bg: "rgba(14,165,233,0.12)", title: "Clear the area", detail: "Ask bystanders to step back and give space. Only trained persons should assist." },
  { icon: Phone, color: "#22C55E", bg: "rgba(34,197,94,0.12)", title: "Stay on the line", detail: "A responder may call you back for live guidance. Keep your phone accessible and volume up." },
  { icon: Clock, color: "#A78BFA", bg: "rgba(167,139,250,0.12)", title: "Wait for responders", detail: "School emergency team has been dispatched. Average response time is 3–5 minutes." },
];

const MINOR_STEPS = [
  { icon: Shield, color: "#22C55E", bg: "rgba(34,197,94,0.12)", title: "Escort to the clinic", detail: "If the student can walk, bring them to the school clinic for assessment." },
  { icon: Heart, color: "#0EA5E9", bg: "rgba(14,165,233,0.12)", title: "Keep them comfortable", detail: "Have them sit or lie down in a safe location while waiting." },
  { icon: Users, color: "#EAB308", bg: "rgba(234,179,8,0.12)", title: "Monitor the situation", detail: "Watch for any worsening symptoms. If condition deteriorates, alert again immediately." },
  { icon: Phone, color: "#A78BFA", bg: "rgba(167,139,250,0.12)", title: "Notify a teacher or staff", detail: "Inform the nearest adult or faculty member about the incident." },
  { icon: Clock, color: "#00D4AA", bg: "rgba(0,212,170,0.12)", title: "Wait for the nurse", detail: "School health staff has been notified and will respond shortly." },
];

export function Step5_Sent({ incident, reportData, onReset }: Step5Props) {
  const [sentTime] = useState(new Date());
  const isUrgent = incident.severity === "urgent";
  const steps = isUrgent ? URGENT_STEPS : MINOR_STEPS;
  const accentColor = isUrgent ? "#EF4444" : "#22C55E";
  const accentBg = isUrgent ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.08)";
  const etaMin = isUrgent ? "3–5" : "5–10";

  const sentTimeStr = sentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 lg:px-10 py-4"
        style={{ background: "#0A0C12", borderBottom: `1px solid ${accentColor}22` }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: accentBg, border: `1px solid ${accentColor}55` }}
            animate={{ boxShadow: [`0 0 0 0 ${accentColor}44`, `0 0 0 12px ${accentColor}00`, `0 0 0 0 ${accentColor}00`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CheckCircle size={20} color={accentColor} />
          </motion.div>
          <div>
            <p style={{ color: accentColor, fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em" }}>
              REPORT TRANSMITTED
            </p>
            <h2 style={{ color: "#F0F4FF", fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Emergency Alert Sent — Help Is On the Way
            </h2>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-full"
              style={{ width: "24px", height: "8px", background: accentColor }}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Confirmation card */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            {/* Status card */}
            <motion.div
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: accentBg, border: `1px solid ${accentColor}44` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col items-center gap-3 text-center py-2">
                <motion.div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `${accentColor}22`, border: `2px solid ${accentColor}55` }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <CheckCircle size={32} color={accentColor} />
                </motion.div>
                <div>
                  <p style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 800 }}>Alert Delivered</p>
                  <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>
                    Confirmed at {sentTimeStr}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { label: "INCIDENT TYPE", value: incident.label, icon: AlertTriangle, color: accentColor },
                  { label: "SENT", value: sentTimeStr, icon: Clock, color: "#A78BFA" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <Icon size={12} color={item.color} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.08em" }}>{item.label}</p>
                        <p style={{ color: "#C8D6F0", fontSize: "12px", fontWeight: 500, marginTop: "1px", wordBreak: "break-word" }}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>TIME ELAPSED</span>
                <span style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600 }}>
                  <ElapsedTimer startTime={sentTime} />
                </span>
              </div>
            </motion.div>

            {/* ETA card */}
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "#0E1117", border: "1px solid rgba(0,212,170,0.2)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,212,170,0.12)" }}>
                <Clock size={18} color="#00D4AA" />
              </div>
              <div>
                <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.1em" }}>ESTIMATED RESPONSE</p>
                <p style={{ color: "#00D4AA", fontFamily: "DM Mono, monospace", fontSize: "22px", fontWeight: 800, lineHeight: 1 }}>
                  {etaMin} min
                </p>
                <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>Responders dispatched</p>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8FAD" }}
            >
              <RefreshCw size={13} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "11px" }}>File Another Report</span>
            </button>
          </div>

          {/* RIGHT — What to do now */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div>
              <h3 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                What to do while waiting for responders
              </h3>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>
                Follow these steps carefully until emergency personnel arrive
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4 rounded-2xl p-4"
                    style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: step.bg, border: `1px solid ${step.color}33` }}
                    >
                      <Icon size={18} color={step.color} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}
                        >
                          STEP {i + 1}
                        </span>
                        <p style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 700 }}>{step.title}</p>
                      </div>
                      <p style={{ color: "#7A8FAD", fontSize: "13px", lineHeight: 1.6 }}>{step.detail}</p>
                    </div>
                    <ChevronRight size={14} color="#2A3A52" className="shrink-0 mt-1" />
                  </motion.div>
                );
              })}
            </div>

            {/* Emergency numbers */}
            <div
              className="rounded-2xl p-4 grid grid-cols-3 gap-3"
              style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-2 col-span-3 mb-1">
                <Phone size={13} color="#00D4AA" />
                <span style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>Emergency Contacts</span>
              </div>
              {[
                { name: "School Nurse", ext: "loc. 101", color: "#22C55E" },
                { name: "Security", ext: "loc. 105", color: "#EF4444" },
                { name: "National Emergency", ext: "911", color: "#EF4444" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>{c.name}</span>
                  <span style={{ color: c.color, fontFamily: "DM Mono, monospace", fontSize: "16px", fontWeight: 700 }}>{c.ext}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
