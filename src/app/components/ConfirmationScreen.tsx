import { motion } from "motion/react";
import { CheckCircle, Phone, MapPin, Clock, X } from "lucide-react";

interface ConfirmationScreenProps {
  onDismiss: () => void;
  onCancel: () => void;
}

export function ConfirmationScreen({ onDismiss, onCancel }: ConfirmationScreenProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(8,13,26,0.96)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
        style={{ background: "#111827", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 60px rgba(239,68,68,0.2)" }}
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)" }}
            animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 16px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0)"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <CheckCircle size={32} color="#EF4444" />
          </motion.div>
          <div>
            <h2 style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 700 }}>
              Alert Sent
            </h2>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "4px" }}>
              Emergency services have been notified
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "#0D1525" }}>
            <Clock size={14} color="#00D4AA" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>TIME SENT</p>
              <p style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "13px", fontWeight: 500 }}>{timeStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "#0D1525" }}>
            <MapPin size={14} color="#00D4AA" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>LOCATION</p>
              <p style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500 }}>Memorial Medical Center, FL</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "#0D1525" }}>
            <Phone size={14} color="#22C55E" />
            <div>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>RESPONDERS ALERTED</p>
              <p style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "13px", fontWeight: 500 }}>ETA ~4 min — Unit 7 dispatched</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-98"
            style={{ background: "#EF4444", color: "#fff", fontFamily: "Inter, sans-serif" }}
            onClick={onDismiss}
          >
            I'm aware — close this
          </button>
          <button
            className="w-full py-3 rounded-xl text-sm transition-all active:scale-98 flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.06)", color: "#7A8FAD", fontFamily: "Inter, sans-serif", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={onCancel}
          >
            <X size={14} />
            Cancel alert (false alarm)
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
