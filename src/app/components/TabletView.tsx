import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Bell, Clock, MapPin, Shield, User, ChevronRight } from "lucide-react";
import { EmergencyButton } from "./EmergencyButton";
import { StatusBadge, AlertStatus, STATUS_CONFIG } from "./StatusBadge";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { AlertHistory } from "./AlertHistory";
import { LocationCard } from "./LocationCard";
import { SafetyUpdates } from "./SafetyUpdates";

interface TabletViewProps {
  status: AlertStatus;
  onStatusChange: (s: AlertStatus) => void;
  isEmergency: boolean;
  onEmergency: () => void;
  onCancelEmergency: () => void;
}

type PanelTab = "alerts" | "location" | "updates";

export function TabletView({ status, onStatusChange, isEmergency, onEmergency, onCancelEmergency }: TabletViewProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>("alerts");
  const [showConfirm, setShowConfirm] = useState(false);
  const statusConfig = STATUS_CONFIG[status];

  const handleActivate = () => {
    onEmergency();
    setShowConfirm(true);
  };

  const handleDismissConfirm = () => setShowConfirm(false);
  const handleCancelAlert = () => { setShowConfirm(false); onCancelEmergency(); };

  return (
    <div className="flex flex-col h-full" style={{ background: "#080D1A", fontFamily: "Inter, sans-serif" }}>
      {/* Top navigation bar */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ background: "#0D1525", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.25)" }}
          >
            <Shield size={18} color="#00D4AA" />
          </div>
          <div>
            <h1 style={{ color: "#F0F4FF", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Safe Alert System
            </h1>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
              Emergency Medical Response Network
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
            <User size={13} color="#7A8FAD" />
            <div>
              <p style={{ color: "#F0F4FF", fontSize: "12px", fontWeight: 600 }}>Maya Chen</p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>ID #4821 · Unit 7</p>
            </div>
          </div>
          <StatusBadge status={status} size="md" />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center relative cursor-pointer"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Bell size={15} color="#7A8FAD" />
            {isEmergency && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                style={{ background: "#EF4444" }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content — 3-column grid */}
      <div className="flex-1 overflow-hidden grid gap-5 p-6" style={{ gridTemplateColumns: "280px 1fr 320px" }}>

        {/* LEFT PANEL — user status + status selector */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* User status card */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "#111827",
              border: `1px solid ${statusConfig.ring}`,
              boxShadow: `0 0 24px ${statusConfig.ring}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
                CURRENT STATUS
              </span>
              <StatusBadge status={status} size="sm" />
            </div>

            <div className="flex flex-col items-center gap-2 py-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: statusConfig.bg }}
              >
                <Shield size={28} color={statusConfig.color} />
              </div>
              <p style={{ color: statusConfig.color, fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700, textAlign: "center" }}>
                {statusConfig.description}
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
                Updated 09:14 AM
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {(["safe", "caution", "elevated", "emergency"] as AlertStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: isActive ? cfg.bg : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? cfg.ring : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: isActive ? cfg.color : "#C8D6F0", fontFamily: "DM Mono, monospace", fontSize: "11px", fontWeight: isActive ? 600 : 400 }}>
                        {cfg.label}
                      </p>
                      <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>
                        {cfg.description}
                      </p>
                    </div>
                    {isActive && <ChevronRight size={12} color={cfg.color} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vitals card */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2">
              <Activity size={13} color="#00D4AA" />
              <span style={{ color: "#F0F4FF", fontSize: "12px", fontWeight: 600 }}>Live Vitals</span>
              <motion.div
                className="ml-auto w-1.5 h-1.5 rounded-full"
                style={{ background: "#22C55E" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            {[
              { label: "Heart Rate", value: "72 bpm", color: "#EF4444" },
              { label: "Blood O₂", value: "98%", color: "#0EA5E9" },
              { label: "Temperature", value: "98.4°F", color: "#F97316" },
              { label: "Blood Pressure", value: "118/78", color: "#A78BFA" },
              { label: "Resp. Rate", value: "15/min", color: "#00D4AA" },
            ].map((v) => (
              <div key={v.label} className="flex items-center justify-between">
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>{v.label}</span>
                <span style={{ color: v.color, fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600 }}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL — emergency button + stats */}
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Emergency button */}
          <div
            className="w-full rounded-3xl flex flex-col items-center justify-center gap-6 py-10"
            style={{
              background: isEmergency
                ? "radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, #111827 70%)"
                : "radial-gradient(ellipse at center, rgba(0,212,170,0.06) 0%, #111827 70%)",
              border: `1px solid ${isEmergency ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div>
              <h2 style={{ color: "#F0F4FF", fontSize: "22px", fontWeight: 700, textAlign: "center", letterSpacing: "-0.02em" }}>
                {isEmergency ? "Emergency Alert Active" : "Emergency Control"}
              </h2>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", textAlign: "center", marginTop: "4px" }}>
                {isEmergency ? "Services dispatched — Unit 7 ETA 4 min" : "Hold the button to send an emergency alert"}
              </p>
            </div>
            <EmergencyButton onActivate={handleActivate} isEmergency={isEmergency} size="tablet" />
          </div>

          {/* Stats row */}
          <div className="w-full grid grid-cols-4 gap-3">
            {[
              { label: "Response Time", value: "4.2 min", sub: "avg today", color: "#00D4AA" },
              { label: "Alerts Sent", value: "0", sub: "today", color: "#F0F4FF" },
              { label: "System Uptime", value: "99.8%", sub: "this week", color: "#22C55E" },
              { label: "Active Units", value: "12", sub: "nearby", color: "#0EA5E9" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span style={{ color: stat.color, fontFamily: "DM Mono, monospace", fontSize: "22px", fontWeight: 700, lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500 }}>
                  {stat.label}
                </span>
                <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — tabbed info panel */}
        <div
          className="rounded-2xl flex flex-col overflow-hidden"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Panel tabs */}
          <div
            className="flex items-center gap-0 p-1.5"
            style={{ background: "#0D1525", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {([
              { id: "alerts" as PanelTab, icon: Clock, label: "History" },
              { id: "location" as PanelTab, icon: MapPin, label: "Location" },
              { id: "updates" as PanelTab, icon: Shield, label: "Safety" },
            ]).map(({ id, icon: Icon, label }) => {
              const isActive = panelTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setPanelTab(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
                  style={{
                    background: isActive ? "#111827" : "transparent",
                    border: isActive ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  }}
                >
                  <Icon size={12} color={isActive ? "#00D4AA" : "#4A5F7A"} />
                  <span style={{ color: isActive ? "#F0F4FF" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: isActive ? 600 : 400 }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {panelTab === "alerts" && (
                <motion.div
                  key="alerts"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <h3 style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>Recent Alerts</h3>
                  <AlertHistory />
                </motion.div>
              )}
              {panelTab === "location" && (
                <motion.div
                  key="location"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LocationCard compact={false} />
                </motion.div>
              )}
              {panelTab === "updates" && (
                <motion.div
                  key="updates"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <h3 style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 600 }}>Safety Updates</h3>
                  <SafetyUpdates />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmationScreen onDismiss={handleDismissConfirm} onCancel={handleCancelAlert} />
        )}
      </AnimatePresence>
    </div>
  );
}
