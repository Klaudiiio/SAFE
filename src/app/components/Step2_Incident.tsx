import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Stethoscope, ChevronRight, ArrowLeft } from "lucide-react";

export interface IncidentType {
  id: string;
  label: string;
  signs: string;
  severity: "urgent" | "minor";
}

interface IncidentTypeResponse {
  code: string;
  incident_name: string;
  priority_level: "urgent" | "minor";
  guidance: string;
}

interface Step2Props {
  onSelect: (incident: IncidentType) => void;
  onBack: () => void;
}

export function Step2_Incident({ onSelect, onBack }: Step2Props) {
  const [tab, setTab] = useState<"urgent" | "minor">("urgent");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "";
  const loadIncidentTypes = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/incident-types/`);
      if (!response.ok) throw new Error(`Could not load incident types (HTTP ${response.status}).`);
      const types = await response.json() as IncidentTypeResponse[];
      if (!Array.isArray(types)) throw new Error("The server returned an invalid incident type list.");
      setIncidents(types.map((type) => ({
        id: type.code,
        label: type.incident_name,
        signs: type.guidance,
        severity: type.priority_level,
      })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load incident types.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadIncidentTypes();
  }, []);

  const list = incidents.filter((incident) => incident.severity === tab);
  const urgentCount = incidents.filter((incident) => incident.severity === "urgent").length;
  const minorCount = incidents.filter((incident) => incident.severity === "minor").length;

  return (
    <div
      className="size-full flex flex-col"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 lg:px-10 py-4"
        style={{ background: "#0A0C12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8FAD" }}
        >
          <ArrowLeft size={15} />
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "11px" }}>Back</span>
        </button>
        <div>
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em" }}>
            STEP 1 OF 4
          </p>
          <h2 style={{ color: "#F0F4FF", fontSize: "clamp(14px, 2vw, 20px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Select the Type of Medical Incident
          </h2>
        </div>
        {/* Progress */}
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-full"
              style={{
                width: n === 1 ? "24px" : "8px",
                height: "8px",
                background: n === 1 ? "#EF4444" : "rgba(255,255,255,0.12)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="px-6 lg:px-10 pt-4 pb-3">
        <div
          className="inline-flex p-1 rounded-2xl gap-1"
          style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={() => setTab("urgent")}
            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-xl transition-all"
            style={{
              background: tab === "urgent" ? "rgba(239,68,68,0.15)" : "transparent",
              border: tab === "urgent" ? "1px solid rgba(239,68,68,0.35)" : "1px solid transparent",
              color: tab === "urgent" ? "#EF4444" : "#7A8FAD",
            }}
          >
            <AlertTriangle size={14} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: tab === "urgent" ? 600 : 400 }}>
              URGENT / EMERGENCY
            </span>
            <span
              className="px-1.5 py-0.5 rounded-md"
              style={{ background: tab === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)", fontSize: "10px", fontFamily: "DM Mono, monospace" }}
            >
              {urgentCount}
            </span>
          </button>
          <button
            onClick={() => setTab("minor")}
            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-xl transition-all"
            style={{
              background: tab === "minor" ? "rgba(34,197,94,0.12)" : "transparent",
              border: tab === "minor" ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
              color: tab === "minor" ? "#22C55E" : "#7A8FAD",
            }}
          >
            <Stethoscope size={14} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: tab === "minor" ? 600 : 400 }}>
              MINOR INCIDENT
            </span>
            <span
              className="px-1.5 py-0.5 rounded-md"
              style={{ background: tab === "minor" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", fontSize: "10px", fontFamily: "DM Mono, monospace" }}
            >
              {minorCount}
            </span>
          </button>
        </div>

        {tab === "urgent" && (
          <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "10px", letterSpacing: "0.08em" }}>
            ⚡ THESE CONDITIONS REQUIRE IMMEDIATE EMERGENCY RESPONSE
          </p>
        )}
        {tab === "minor" && (
          <p style={{ color: "#22C55E", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "10px", letterSpacing: "0.08em" }}>
            ✓ THESE INCIDENTS REQUIRE CLINIC ASSESSMENT AND BASIC FIRST AID
          </p>
        )}
      </div>

      {/* Incident grid */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-6">
        {loadError ? (
          <div role="alert" className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F0F4FF" }}>
            <p>{loadError}</p>
            <button onClick={() => void loadIncidentTypes()} className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.08)", color: "#F0F4FF" }}>Try again</button>
          </div>
        ) : loading ? (
          <p role="status" style={{ color: "#7A8FAD" }}>Loading incident types...</p>
        ) : list.length === 0 ? (
          <p style={{ color: "#7A8FAD" }}>No {tab} incident types are currently available.</p>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((incident, i) => {
            const isUrgent = incident.severity === "urgent";
            const accentColor = isUrgent ? "#EF4444" : "#22C55E";
            const accentBg = isUrgent ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.07)";
            const accentBorder = isUrgent ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.2)";
            const isHovered = hoveredId === incident.id;

            return (
              <motion.button
                key={incident.id}
                className="flex items-center gap-4 rounded-2xl text-left w-full transition-all"
                style={{
                  background: isHovered ? accentBg : "#0E1117",
                  border: `1px solid ${isHovered ? accentColor : "rgba(255,255,255,0.07)"}`,
                  padding: "16px 20px",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setHoveredId(incident.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(incident)}
              >
                {/* Number badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isHovered ? accentBg : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isHovered ? accentBorder : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <span style={{ color: isHovered ? accentColor : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 700 }}>
                    {i + 1}
                  </span>
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: "#F0F4FF", fontSize: "14px", fontWeight: 600, lineHeight: 1.3 }}>
                    {incident.label}
                  </p>
                  <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", marginTop: "3px", lineHeight: 1.4 }}>
                    {incident.signs}
                  </p>
                </div>

                <ChevronRight size={16} color={isHovered ? accentColor : "#2A3A52"} className="shrink-0 transition-colors" />
              </motion.button>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
