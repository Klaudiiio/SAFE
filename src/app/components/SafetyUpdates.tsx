import { CloudSun, Thermometer, Wind, AlertOctagon, ShieldCheck } from "lucide-react";

const updates = [
  {
    icon: ShieldCheck,
    iconColor: "#22C55E",
    iconBg: "rgba(34,197,94,0.12)",
    title: "All systems operational",
    detail: "Emergency response: 4.2 min avg",
    time: "Now",
  },
  {
    icon: CloudSun,
    iconColor: "#0EA5E9",
    iconBg: "rgba(14,165,233,0.12)",
    title: "Weather: Clear skies",
    detail: "Visibility 10+ miles — low risk",
    time: "10 min ago",
  },
  {
    icon: Thermometer,
    iconColor: "#F97316",
    iconBg: "rgba(249,115,22,0.12)",
    title: "Heat advisory in effect",
    detail: "85°F — stay hydrated",
    time: "1 hr ago",
  },
  {
    icon: Wind,
    iconColor: "#A78BFA",
    iconBg: "rgba(167,139,250,0.12)",
    title: "Air quality: Moderate",
    detail: "AQI 68 — acceptable for most",
    time: "2 hr ago",
  },
];

export function SafetyUpdates() {
  return (
    <div className="flex flex-col gap-2">
      {updates.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3"
            style={{ background: "#0D1525", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: item.iconBg }}
            >
              <Icon size={15} color={item.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#C8D6F0", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500 }}>
                {item.title}
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "1px" }}>
                {item.detail}
              </p>
            </div>
            <span className="shrink-0" style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "10px" }}>
              {item.time}
            </span>
          </div>
        );
      })}
    </div>
  );
}
