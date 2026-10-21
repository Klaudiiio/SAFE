import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, Check } from "lucide-react";

interface EmergencyButtonProps {
  onActivate: () => void;
  isEmergency: boolean;
  size?: "mobile" | "tablet";
}

export function EmergencyButton({ onActivate, isEmergency, size = "mobile" }: EmergencyButtonProps) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  const buttonSize = size === "tablet" ? 220 : 180;
  const strokeWidth = size === "tablet" ? 6 : 5;
  const radius = (buttonSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const handlePressStart = useCallback(() => {
    if (isEmergency) return;
    setPressing(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 2.5;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        setPressing(false);
        setProgress(0);
        onActivate();
      }
    }, 40);
    setTimerRef(interval);
  }, [isEmergency, onActivate]);

  const handlePressEnd = useCallback(() => {
    if (timerRef) clearInterval(timerRef);
    setTimerRef(null);
    setPressing(false);
    setProgress(0);
  }, [timerRef]);

  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative select-none" style={{ width: buttonSize, height: buttonSize }}>
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: isEmergency
              ? "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(0,212,170,0.15) 0%, transparent 70%)",
          }}
          animate={isEmergency ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        />

        {/* SVG progress ring */}
        <svg
          className="absolute inset-0"
          width={buttonSize}
          height={buttonSize}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={buttonSize / 2}
            cy={buttonSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={buttonSize / 2}
            cy={buttonSize / 2}
            r={radius}
            fill="none"
            stroke={isEmergency ? "#EF4444" : "#00D4AA"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: "stroke-dashoffset 0.04s linear" }}
          />
        </svg>

        {/* Main button */}
        <motion.button
          className="absolute rounded-full flex flex-col items-center justify-center cursor-pointer focus:outline-none"
          style={{
            inset: strokeWidth * 2,
            background: isEmergency
              ? "radial-gradient(135deg, #7F1D1D 0%, #450A0A 100%)"
              : pressing
              ? "radial-gradient(135deg, #0D3B33 0%, #064E3B 100%)"
              : "radial-gradient(135deg, #1A3A33 0%, #0F2D27 100%)",
            border: `2px solid ${isEmergency ? "#EF4444" : pressing ? "#00D4AA" : "rgba(0,212,170,0.3)"}`,
            boxShadow: isEmergency
              ? "0 0 40px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
              : pressing
              ? "0 0 30px rgba(0,212,170,0.35), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 0 20px rgba(0,212,170,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          whileTap={{ scale: 0.97 }}
          aria-label="Emergency alert button — hold to activate"
        >
          <AnimatePresence mode="wait">
            {isEmergency ? (
              <motion.div
                key="emergency"
                className="flex flex-col items-center gap-1"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                >
                  <AlertTriangle size={size === "tablet" ? 44 : 36} color="#EF4444" />
                </motion.div>
                <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: size === "tablet" ? "12px" : "10px", fontWeight: 600, letterSpacing: "0.15em" }}>
                  ACTIVE
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <span style={{ color: "#00D4AA", fontFamily: "Inter, sans-serif", fontSize: size === "tablet" ? "13px" : "11px", fontWeight: 700, letterSpacing: "0.12em", textAlign: "center", lineHeight: 1.3 }}>
                  {pressing ? `SENDING...` : "HOLD TO\nALERT"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.08em", textAlign: "center" }}>
        {isEmergency ? "Alert sent • Emergency services notified" : pressing ? `${Math.round(progress)}% — keep holding` : "Hold button to send emergency signal"}
      </p>
    </div>
  );
}
