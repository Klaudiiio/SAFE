import { motion } from "motion/react";

export type AlertStatus = "safe" | "caution" | "elevated" | "emergency";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  ring: string;
  pulse: boolean;
  description: string;
}

export const STATUS_CONFIG: Record<AlertStatus, StatusConfig> = {
  safe: {
    label: "Safe",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    ring: "rgba(34,197,94,0.4)",
    pulse: false,
    description: "Normal conditions",
  },
  caution: {
    label: "Caution",
    color: "#EAB308",
    bg: "rgba(234,179,8,0.12)",
    ring: "rgba(234,179,8,0.4)",
    pulse: false,
    description: "Mild risk detected",
  },
  elevated: {
    label: "Elevated",
    color: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    ring: "rgba(249,115,22,0.4)",
    pulse: true,
    description: "High risk — stay alert",
  },
  emergency: {
    label: "EMERGENCY",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
    ring: "rgba(239,68,68,0.5)",
    pulse: true,
    description: "Alert activated",
  },
};

interface StatusBadgeProps {
  status: AlertStatus;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 gap-1.5",
    md: "px-3 py-1.5 gap-2",
    lg: "px-4 py-2 gap-2.5",
  };

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={`inline-flex items-center rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: config.bg, border: `1px solid ${config.ring}` }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`rounded-full ${dotSize[size]}`}
          style={{ backgroundColor: config.color }}
        />
        {config.pulse && (
          <motion.div
            className={`absolute rounded-full ${dotSize[size]}`}
            style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </div>
      <span
        className={`${textSize[size]} font-semibold tracking-wide`}
        style={{ color: config.color, fontFamily: "DM Mono, monospace" }}
      >
        {config.label}
      </span>
    </div>
  );
}
