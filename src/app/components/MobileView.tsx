import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home, Clock, MapPin, Settings, Activity, Bell } from "lucide-react";
import { EmergencyButton } from "./EmergencyButton";
import { StatusBadge, AlertStatus } from "./StatusBadge";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { AlertHistory } from "./AlertHistory";
import { LocationCard } from "./LocationCard";
import { SafetyUpdates } from "./SafetyUpdates";

interface MobileViewProps {
  status: AlertStatus;
  onStatusChange: (s: AlertStatus) => void;
  isEmergency: boolean;
  onEmergency: () => void;
  onCancelEmergency: () => void;
}

type Tab = "home" | "history" | "location" | "settings";

export function MobileView({ status, onStatusChange, isEmergency, onEmergency, onCancelEmergency }: MobileViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleActivate = () => {
    onEmergency();
    setShowConfirm(true);
  };

  const handleDismissConfirm = () => {
    setShowConfirm(false);
  };

  const handleCancelAlert = () => {
    setShowConfirm(false);
    onCancelEmergency();
  };

  const navItems: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: "Home" },
    { id: "history", icon: Clock, label: "History" },
    { id: "location", icon: MapPin, label: "Location" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "#080D1A", fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#00D4AA" }} />
            <span style={{ color: "#F0F4FF", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Safe Alert
            </span>
          </div>
          <p style={{ color: "#7A8FAD", fontSize: "11px", fontFamily: "DM Mono, monospace", marginTop: "2px" }}>
            Maya Chen · ID #4821
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} size="sm" />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center relative"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Bell size={15} color="#7A8FAD" />
            {isEmergency && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-6 pt-4"
            >
              {/* Vitals strip */}
              <div className="w-full grid grid-cols-3 gap-2">
                {[
                  { label: "HEART RATE", value: "72", unit: "bpm", color: "#EF4444" },
                  { label: "OXYGEN", value: "98", unit: "%", color: "#0EA5E9" },
                  { label: "TEMP", value: "98.4", unit: "°F", color: "#F97316" },
                ].map((v) => (
                  <div
                    key={v.label}
                    className="rounded-xl p-3 flex flex-col items-center gap-0.5"
                    style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.06em" }}>{v.label}</span>
                    <span style={{ color: v.color, fontFamily: "DM Mono, monospace", fontSize: "18px", fontWeight: 600, lineHeight: 1 }}>{v.value}</span>
                    <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>{v.unit}</span>
                  </div>
                ))}
              </div>

              {/* Emergency button */}
              <div className="flex flex-col items-center gap-2">
                <EmergencyButton onActivate={handleActivate} isEmergency={isEmergency} size="mobile" />
              </div>

              {/* Status selector */}
              <div className="w-full">
                <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em", marginBottom: "10px" }}>
                  SET STATUS
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(["safe", "caution", "elevated", "emergency"] as AlertStatus[]).map((s) => {
                    const colors = { safe: "#22C55E", caution: "#EAB308", elevated: "#F97316", emergency: "#EF4444" };
                    const labels = { safe: "Safe", caution: "Mild", elevated: "High", emergency: "Alert" };
                    const color = colors[s];
                    const isActive = status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => onStatusChange(s)}
                        className="py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all"
                        style={{
                          background: isActive ? `rgba(${color === "#22C55E" ? "34,197,94" : color === "#EAB308" ? "234,179,8" : color === "#F97316" ? "249,115,22" : "239,68,68"},0.15)` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? color : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                        <span style={{ color: isActive ? color : "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px", fontWeight: isActive ? 600 : 400 }}>
                          {labels[s]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity mini card */}
              <div className="w-full rounded-2xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={13} color="#00D4AA" />
                    <span style={{ color: "#F0F4FF", fontSize: "12px", fontWeight: 600 }}>Today's Overview</span>
                  </div>
                  <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>Jun 16</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Alerts", value: "0", sub: "today" },
                    { label: "Status changes", value: "2", sub: "today" },
                    { label: "Uptime", value: "99.8%", sub: "this week" },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <span style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "16px", fontWeight: 600 }}>{item.value}</span>
                      <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4"
            >
              <h2 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Alert History</h2>
              <AlertHistory />
            </motion.div>
          )}

          {activeTab === "location" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4"
            >
              <h2 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Location</h2>
              <LocationCard compact={false} />
              <div className="mt-4">
                <h3 style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Safety Updates</h3>
                <SafetyUpdates />
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4"
            >
              <h2 style={{ color: "#F0F4FF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Settings</h2>
              {[
                { label: "Notifications", detail: "Push alerts enabled" },
                { label: "Emergency contacts", detail: "Dr. Sarah Wong, James Chen" },
                { label: "Auto-location sharing", detail: "Always on" },
                { label: "Alert hold duration", detail: "1.5 seconds" },
                { label: "Device ID", detail: "#4821-MC-SAFE" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl mb-2"
                  style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p style={{ color: "#F0F4FF", fontSize: "13px", fontWeight: 500 }}>{item.label}</p>
                    <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>{item.detail}</p>
                  </div>
                  <div style={{ color: "#4A5F7A", fontSize: "18px" }}>›</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div
        className="px-4 py-3 flex items-center justify-around"
        style={{ background: "#0D1525", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
              style={{ background: isActive ? "rgba(0,212,170,0.1)" : "transparent" }}
            >
              <Icon size={18} color={isActive ? "#00D4AA" : "#4A5F7A"} />
              <span style={{ color: isActive ? "#00D4AA" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px", fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmationScreen onDismiss={handleDismissConfirm} onCancel={handleCancelAlert} />
        )}
      </AnimatePresence>
    </div>
  );
}
