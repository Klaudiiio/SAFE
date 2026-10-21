import { MapPin, Wifi, Battery, Signal } from "lucide-react";
import { motion } from "motion/react";

interface LocationCardProps {
  compact?: boolean;
}

export function LocationCard({ compact = false }: LocationCardProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,212,170,0.12)" }}
          >
            <MapPin size={14} color="#00D4AA" />
          </div>
          <span style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}>
            Location
          </span>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#22C55E" }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
            LIVE
          </span>
        </div>
      </div>

      <div>
        <p style={{ color: "#F0F4FF", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
          Memorial Medical Center
        </p>
        <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px", marginTop: "2px" }}>
          1420 NW 12th Ave, Miami FL 33136
        </p>
      </div>

      {!compact && (
        <div
          className="rounded-xl overflow-hidden relative"
          style={{ height: "100px", background: "#0D1525" }}
        >
          <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="100" fill="#0D1525" />
            <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="150" y1="0" x2="150" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            {[...Array(6)].map((_, i) => (
              <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
            {[...Array(4)].map((_, i) => (
              <line key={i} x1="0" y1={i * 25} x2="300" y2={i * 25} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
            <circle cx="150" cy="50" r="8" fill="rgba(0,212,170,0.2)" />
            <circle cx="150" cy="50" r="4" fill="#00D4AA" />
            <circle cx="150" cy="50" r="16" fill="none" stroke="rgba(0,212,170,0.25)" strokeWidth="1" />
            <circle cx="150" cy="50" r="24" fill="none" stroke="rgba(0,212,170,0.1)" strokeWidth="1" />
          </svg>
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.5)" }}>
            <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "9px" }}>
              25.7617° N, 80.1918° W
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Signal size={12} color="#00D4AA" />
          <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>GPS ±3m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi size={12} color="#0EA5E9" />
          <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>LTE Connected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Battery size={12} color="#22C55E" />
          <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>84%</span>
        </div>
      </div>
    </div>
  );
}
