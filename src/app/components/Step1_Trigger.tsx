import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Thermometer, Wind, Clock, Shield, AlertTriangle, Droplets } from "lucide-react";

interface Step1Props {
  onActivate: () => void;
}

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Step1_Trigger({ onActivate }: Step1Props) {
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const now = useTime();

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const handlePress = () => {
    if (pressed) return;
    setPressed(true);
    setRipples((r) => [...r, Date.now()]);
    setTimeout(() => onActivate(), 900);
  };

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 lg:px-10 py-3 lg:py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
          >
            <Shield size={18} color="#EF4444" />
          </div>
          <div>
            <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "clamp(10px, 1.5vw, 13px)", fontWeight: 600, letterSpacing: "0.12em" }}>
              SAFE:MEAS
            </p>
            <p style={{ color: "#F0F4FF", fontSize: "clamp(12px, 1.8vw, 16px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Medical-Incident Emergency Alert System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: "#22C55E" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.08em" }}>
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-visible flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 px-6 lg:px-16 py-6 lg:py-8">

        {/* LEFT side panel — environment data */}
        <div className="flex w-full flex-col items-stretch gap-4 lg:w-72 lg:gap-5">
          {/* Clock */}
          <div
            className="w-full rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex flex-col gap-1 lg:gap-2"
            style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)", minWidth: 0 }}
          >
            <div className="flex items-center gap-2">
              <Clock size={12} color="#7A8FAD" />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>LOCAL TIME</span>
            </div>
            <p style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {timeStr}
            </p>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "clamp(9px, 1.2vw, 12px)" }}>
              {dateStr}
            </p>
          </div>

          {/* Temperature */}
          <div
            className="w-full rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Thermometer size={12} color="#F97316" />
              <span style={{ color: "#F97316", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>TEMPERATURE</span>
            </div>
            <div className="flex items-end gap-2">
              <span style={{ color: "#F97316", fontFamily: "DM Mono, monospace", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1 }}>
                88
              </span>
              <span style={{ color: "#F97316", fontFamily: "DM Mono, monospace", fontSize: "clamp(14px, 2vw, 22px)", fontWeight: 400, paddingBottom: "4px" }}>°F</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: "68%", background: "linear-gradient(90deg, #F97316, #EF4444)" }} />
              </div>
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>68%</span>
            </div>
          </div>

          {/* Heat index */}
          <div
            className="w-full rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(234,179,8,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Wind size={12} color="#EAB308" />
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>HEAT INDEX</span>
            </div>
            <div className="flex items-end gap-2">
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1 }}>
                96
              </span>
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "clamp(14px, 2vw, 22px)", fontWeight: 400, paddingBottom: "4px" }}>°F</span>
            </div>
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-lg"
              style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}
            >
              <AlertTriangle size={10} color="#EAB308" />
              <span style={{ color: "#EAB308", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>CAUTION LEVEL</span>
            </div>

            <div className="flex items-center gap-2">
              <Droplets size={10} color="#0EA5E9" />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>Humidity: 72%</span>
            </div>
          </div>
        </div>

        {/* CENTER — Emergency button */}
        <div className="flex flex-col items-center gap-6 lg:gap-8">
          <div className="text-center">
            <h1 style={{ color: "#F0F4FF", fontSize: "clamp(20px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              EMERGENCY
            </h1>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "clamp(10px, 1.4vw, 14px)", marginTop: "6px", letterSpacing: "0.06em" }}>
              PRESS ONCE TO ACTIVATE ALERT
            </p>
          </div>

          {/* The big red button */}
          <div className="relative flex items-center justify-center" style={{ width: "clamp(220px, 32vw, 380px)", height: "clamp(220px, 32vw, 380px)" }}>
            {/* Outer pulse rings */}
            {!pressed && (
              <>
                <motion.div
                  className="absolute rounded-full"
                  style={{ inset: "-20px", border: "2px solid rgba(220,38,38,0.15)" }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{ inset: "-40px", border: "1px solid rgba(220,38,38,0.08)" }}
                  animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.05, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </>
            )}

            {/* Ripple effect on press */}
            <AnimatePresence>
              {ripples.map((key) => (
                <motion.div
                  key={key}
                  className="absolute rounded-full pointer-events-none"
                  style={{ inset: 0, border: "3px solid rgba(220,38,38,0.6)" }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{}}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>

            {/* Button */}
            <motion.button
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center cursor-pointer select-none focus:outline-none"
              style={{
                background: pressed
                  ? "radial-gradient(circle at 40% 35%, #991B1B, #450A0A)"
                  : "radial-gradient(circle at 40% 35%, #DC2626, #7F1D1D)",
                boxShadow: pressed
                  ? "0 0 80px rgba(220,38,38,0.6), 0 0 160px rgba(220,38,38,0.25), inset 0 -6px 20px rgba(0,0,0,0.5), inset 0 4px 12px rgba(255,255,255,0.08)"
                  : "0 0 60px rgba(220,38,38,0.5), 0 0 120px rgba(220,38,38,0.2), inset 0 -8px 24px rgba(0,0,0,0.4), inset 0 6px 16px rgba(255,255,255,0.12)",
                border: "4px solid rgba(239,68,68,0.5)",
              }}
              onClick={handlePress}
              whileTap={{ scale: 0.96 }}
              animate={pressed ? {} : { boxShadow: ["0 0 60px rgba(220,38,38,0.5), 0 0 120px rgba(220,38,38,0.2)", "0 0 80px rgba(220,38,38,0.7), 0 0 160px rgba(220,38,38,0.3)", "0 0 60px rgba(220,38,38,0.5), 0 0 120px rgba(220,38,38,0.2)"] }}
              transition={pressed ? {} : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              aria-label="Emergency alert — press once to activate"
            >
              <motion.div
                className="flex flex-col items-center gap-2"
                animate={pressed ? { scale: 0.9, opacity: 0.7 } : {}}
              >
                <AlertTriangle
                  style={{ width: "clamp(36px, 6vw, 72px)", height: "clamp(36px, 6vw, 72px)" }}
                  color="rgba(255,255,255,0.95)"
                  strokeWidth={2}
                />
                <span style={{
                  color: "rgba(255,255,255,0.95)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(14px, 2.5vw, 24px)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}>
                  {pressed ? "ACTIVATING..." : "EMERGENCY"}
                </span>
              </motion.div>
            </motion.button>
          </div>

          <p style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "clamp(9px, 1.2vw, 11px)", textAlign: "center", letterSpacing: "0.08em", maxWidth: "280px" }}>
            ONE PRESS ACTIVATES EMERGENCY PROTOCOL · ALL SESSIONS ARE LOGGED
          </p>
        </div>

        {/* RIGHT side panel — facility info */}
        <div className="hidden lg:flex flex-col gap-4 lg:gap-5">
          <div
            className="rounded-3xl p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
              FACILITY
            </span>
            <div>
              <p style={{ color: "#F0F4FF", fontSize: "16px", fontWeight: 700 }}>Manila Central</p>
              <p style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 500 }}>High School Campus</p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>Building C — Main Hall</p>
            </div>
            <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "RESPONDERS ON DUTY", value: "4" },
                { label: "CLINIC STATUS", value: "OPEN" },
                { label: "RESPONSE AVG", value: "3.2 min" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.08em" }}>{item.label}</span>
                  <span style={{ color: "#C8D6F0", fontFamily: "DM Mono, monospace", fontSize: "11px", fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-3xl p-6 flex flex-col gap-3"
            style={{ background: "#0E1117", border: "1px solid rgba(14,165,233,0.15)" }}
          >
            <span style={{ color: "#0EA5E9", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
              QUICK CONTACTS
            </span>
            {[
              { name: "School Nurse", ext: "loc. 101" },
              { name: "Security Office", ext: "loc. 105" },
              { name: "Admin Office", ext: "loc. 100" },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <span style={{ color: "#C8D6F0", fontSize: "13px" }}>{c.name}</span>
                <span style={{ color: "#0EA5E9", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>{c.ext}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
