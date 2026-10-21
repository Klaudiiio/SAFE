import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Video, VideoOff, AlertTriangle, Send, Clock } from "lucide-react";
import { IncidentType } from "./Step2_Incident";
import { ReportData } from "./Step3_Report";

interface Step4Props {
  incident: IncidentType;
  reportData: ReportData;
  onComplete: () => void;
}

const TOTAL_SECONDS = 25;

export function Step4_Recording({ incident, reportData, onComplete }: Step4Props) {
  const [phase, setPhase] = useState<"countdown" | "recording" | "sending" | "done">("countdown");
  const [countdownVal, setCountdownVal] = useState(3);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioActive, setAudioActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [waveform, setWaveform] = useState<number[]>(Array(32).fill(4));
  const waveformRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUrgent = incident.severity === "urgent";
  const accentColor = isUrgent ? "#EF4444" : "#22C55E";

  // Countdown 3…2…1
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setInterval(() => {
      setCountdownVal((v) => {
        if (v <= 1) {
          clearInterval(id);
          setPhase("recording");
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Recording timer
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      setRecordSeconds((s) => {
        if (s >= TOTAL_SECONDS) {
          clearInterval(id);
          setPhase("sending");
          setTimeout(() => setPhase("done"), 2500);
          return s;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Waveform animation
  useEffect(() => {
    if (phase !== "recording") {
      if (waveformRef.current) clearInterval(waveformRef.current);
      return;
    }
    waveformRef.current = setInterval(() => {
      setWaveform(Array.from({ length: 32 }, () =>
        audioActive ? Math.floor(Math.random() * 36) + 4 : 4
      ));
    }, 80);
    return () => { if (waveformRef.current) clearInterval(waveformRef.current); };
  }, [phase, audioActive]);

  const progress = recordSeconds / TOTAL_SECONDS;
  const remaining = TOTAL_SECONDS - recordSeconds;

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className="size-full flex flex-col items-center justify-center"
      style={{ background: "#080A0F", fontFamily: "Inter, sans-serif" }}
    >
      <AnimatePresence mode="wait">

        {/* COUNTDOWN */}
        {phase === "countdown" && (
          <motion.div
            key="countdown"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ background: "#EF4444" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "14px", letterSpacing: "0.15em" }}>
                RECORDING STARTS IN
              </span>
            </div>
            <motion.div
              key={countdownVal}
              style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "clamp(80px, 18vw, 180px)", fontWeight: 800, lineHeight: 1 }}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {countdownVal}
            </motion.div>
            <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "12px" }}>
              Stay calm — speak clearly about the situation
            </p>
          </motion.div>
        )}

        {/* RECORDING */}
        {phase === "recording" && (
          <motion.div
            key="recording"
            className="w-full max-w-2xl px-6 flex flex-col items-center gap-6 lg:gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <motion.div
                className="w-4 h-4 rounded-full"
                style={{ background: "#EF4444" }}
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, letterSpacing: "0.1em" }}>
                RECORDING IN PROGRESS
              </span>
            </div>

            {/* Incident badge */}
            <div
              className="px-4 py-2 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <p style={{ color: "#C8D6F0", fontFamily: "DM Mono, monospace", fontSize: "11px", textAlign: "center" }}>
                <span style={{ color: "#EF4444" }}>●</span> {incident.label} · {reportData.building}, {reportData.floor}
              </p>
            </div>

            {/* Timer ring */}
            <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
              <svg width={180} height={180} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
                <circle cx={90} cy={90} r={82} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <motion.circle
                  cx={90}
                  cy={90}
                  r={82}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 82}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 82}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="flex flex-col items-center gap-1 z-10">
                <span style={{ color: "#F0F4FF", fontFamily: "DM Mono, monospace", fontSize: "40px", fontWeight: 800, lineHeight: 1 }}>
                  {formatTime(recordSeconds)}
                </span>
                <span style={{ color: "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {remaining}s remaining
                </span>
              </div>
            </div>

            {/* Waveform */}
            <div className="w-full flex items-center justify-center gap-0.5" style={{ height: 56 }}>
              {waveform.map((h, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{ width: 3, background: audioActive ? "#EF4444" : "#2A3A52" }}
                  animate={{ height: h }}
                  transition={{ duration: 0.08 }}
                />
              ))}
            </div>

            {/* Guidance prompt */}
            <div
              className="w-full rounded-2xl p-4"
              style={{ background: "#0E1117", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "8px" }}>
                PLEASE DESCRIBE THE FOLLOWING:
              </p>
              {[
                "Where exactly you are on campus right now",
                "What you are observing — describe the symptoms or situation",
                "How many people are affected",
                "Any actions already taken (first aid, CPR, etc.)",
              ].map((prompt, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-2">
                  <span style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "11px", minWidth: "16px" }}>{i + 1}.</span>
                  <p style={{ color: "#C8D6F0", fontSize: "13px", lineHeight: 1.5 }}>{prompt}</p>
                </div>
              ))}
            </div>

            {/* Media toggles */}
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: audioActive ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${audioActive ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
                }}
                onClick={() => setAudioActive(!audioActive)}
              >
                {audioActive ? <Mic size={14} color="#EF4444" /> : <MicOff size={14} color="#4A5F7A" />}
                <span style={{ color: audioActive ? "#EF4444" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {audioActive ? "MIC ON" : "MIC OFF"}
                </span>
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: videoActive ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${videoActive ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}
                onClick={() => setVideoActive(!videoActive)}
              >
                {videoActive ? <Video size={14} color="#0EA5E9" /> : <VideoOff size={14} color="#4A5F7A" />}
                <span style={{ color: videoActive ? "#0EA5E9" : "#4A5F7A", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {videoActive ? "CAM ON" : "CAM OFF"}
                </span>
              </button>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Clock size={12} color="#7A8FAD" />
                <span style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "11px" }}>
                  {formatTime(recordSeconds)} / {formatTime(TOTAL_SECONDS)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* SENDING */}
        {phase === "sending" && (
          <motion.div
            key="sending"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Send size={28} color="#EF4444" />
            </motion.div>
            <div className="text-center">
              <p style={{ color: "#EF4444", fontFamily: "DM Mono, monospace", fontSize: "16px", fontWeight: 700, letterSpacing: "0.1em" }}>
                TRANSMITTING REPORT...
              </p>
              <p style={{ color: "#7A8FAD", fontFamily: "DM Mono, monospace", fontSize: "12px", marginTop: "6px" }}>
                Sending to emergency response team
              </p>
            </div>
          </motion.div>
        )}

        {/* DONE — auto-transition */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onAnimationComplete={() => setTimeout(onComplete, 400)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
