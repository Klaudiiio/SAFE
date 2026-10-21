import { AlertTriangle, Check, Clock, Info } from "lucide-react";
import { AlertStatus, STATUS_CONFIG } from "./StatusBadge";

interface AlertEntry {
  id: string;
  type: AlertStatus;
  message: string;
  time: string;
  resolved: boolean;
}

const MOCK_ALERTS: AlertEntry[] = [
  { id: "1", type: "emergency", message: "Emergency alert triggered — unit 4B", time: "09:14", resolved: true },
  { id: "2", type: "elevated", message: "Elevated risk threshold exceeded", time: "08:52", resolved: true },
  { id: "3", type: "caution", message: "Mild anomaly detected in vitals", time: "07:30", resolved: true },
  { id: "4", type: "safe", message: "System check passed — all clear", time: "06:00", resolved: true },
  { id: "5", type: "caution", message: "Location outside safe zone", time: "Yesterday 22:11", resolved: true },
];

export function AlertHistory() {
  return (
    <div className="flex flex-col gap-2">
      {MOCK_ALERTS.map((alert) => {
        const config = STATUS_CONFIG[alert.type];
        return (
          <div
            key={alert.id}
            className="flex items-start gap-3 rounded-xl px-3.5 py-3"
            style={{ background: config.bg, border: `1px solid ${config.ring}` }}
          >
            <div className="mt-0.5 shrink-0">
              {alert.type === "emergency" ? (
                <AlertTriangle size={14} style={{ color: config.color }} />
              ) : alert.type === "safe" ? (
                <Check size={14} style={{ color: config.color }} />
              ) : (
                <Info size={14} style={{ color: config.color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#C8D6F0", fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.4 }}>
                {alert.message}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Clock size={10} style={{ color: "#7A8FAD" }} />
              <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
                {alert.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
