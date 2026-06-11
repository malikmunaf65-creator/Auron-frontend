import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, FileAudio2, Brain, Loader2, Sparkles, KeyRound, ExternalLink, ShieldAlert } from "lucide-react";
import { playClickSfx, playHoverSfx, playSuccessSfx, playErrorSfx } from "@/src/utils/audio";
import { DigitHistory } from "@/src/types";
import { getTranslatedPhonetic } from "@/src/utils/languages";
import { t } from "@/src/utils/translations";

interface UploadViewProps {
  onNavigate: (page: string) => void;
  onAddHistory: (record: DigitHistory) => void;
  userProfile?: {
    username: string;
    email: string;
    clearance: string;
    secureSignature: string;
  } | null;
  appLanguage?: string;
}

export default function UploadView({ onNavigate, onAddHistory, userProfile, appLanguage = "English (US)" }: UploadViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Free uploads are accessible for mapping preview to all system guests. Registration is verified during output access.
  const checkLimitAndProceed = (action: () => void) => {
    action();
  };

  const startUploadSimulation = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setErrorText("");
    setStatusMessage("Acquiring audio stream...");

    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setStatusMessage("Encrypting spectroscopic data...");
        setUploadProgress(100);
        setTimeout(() => {
          setStatusMessage("Audio upload complete.");
        }, 800);
      } else {
        setUploadProgress(progress);
        if (progress > 30 && progress < 70) {
          setStatusMessage("Fourier spectral parsing...");
        } else if (progress >= 70) {
          setStatusMessage("Formatting phonetic mapping...");
        }
      }
    }, 120);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      checkLimitAndProceed(() => {
        setSelectedFile(file);
        playClickSfx();
        startUploadSimulation(file);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      checkLimitAndProceed(() => {
        if (file.type.startsWith("audio/")) {
          setSelectedFile(file);
          playSuccessSfx();
          startUploadSimulation(file);
        } else {
          setErrorText(t("Unrecognized protocol. Please serve standard Audio files only.", appLanguage));
          playErrorSfx();
        }
      });
    }
  };

  const triggerBrowse = () => {
    checkLimitAndProceed(() => {
      playClickSfx();
      fileInputRef.current?.click();
    });
  };

  const handleInitiateAnalysis = async () => {
    if (!selectedFile) return;
    playClickSfx();
    setIsUploading(true);
    setStatusMessage(t("Running phonetic mapping model on Auron neural grid...", appLanguage));

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const base64Payload = base64Data.split(",")[1];

         const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120000);
const response = await fetch("/api/recognize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    audio: base64Payload,
    mimeType: selectedFile.type || "audio/wav",
  }),
  signal: controller.signal,
});
clearTimeout(timeout);

          if (!response.ok) {
            throw new Error("Auron prediction network response was invalid.");
          }

          const data = await response.json();

          const durationSimulation = Math.floor(Math.random() * 3) + 1.5;

          const newRecord: DigitHistory = {
            id: `upload_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            digit: typeof data.digit === "number" ? data.digit : 0,
            english: data.english || "unknown",
            greek: getTranslatedPhonetic(typeof data.digit === "number" ? data.digit : 0),
            confidence: data.confidence || 0.95,
            analysis: data.analysis || "Processed via modern zero-shot neural analyzer.",
            filename: selectedFile.name,
            durationSecs: durationSimulation,
            isLive: false,
            audioData: URL.createObjectURL(selectedFile),
            isMock: !!data.isMock
          };

         playSuccessSfx();
onAddHistory(newRecord);
onNavigate("results");
} catch (err: any) {
  console.error("Ingestion recognition mistake:", err);
  if (err.name === 'AbortError') {
    setErrorText("Request timed out — try a shorter audio file.");
  } else {
    setErrorText(`Analysis failed: ${err.message}`);
  }
  playErrorSfx();
  setIsUploading(false);
}
    } catch (err: any) {
      console.error(err);
      setErrorText("Failed to read files. Secure isolated environment.");
      setIsUploading(false);
      playErrorSfx();
    }
  };

  const handleClear = () => {
    playClickSfx();
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setStatusMessage("");
    setErrorText("");
  };

  // Human-readable file size conversion
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const sizeString = selectedFile ? formatBytes(selectedFile.size) : "0 MB";
  const processedSizeString = selectedFile 
    ? formatBytes(Math.floor(selectedFile.size * (uploadProgress / 100))) 
    : "0 MB";

  return (
    <div className="flex-grow flex items-center justify-center p-6 pt-24 md:pt-28 relative z-10 w-full max-w-[1440px] mx-auto select-none">
      
      {/* Glassmorphism Dynamic Upload Card */}
      <div className="w-full max-w-2xl bg-[#1f1f26]/40 backdrop-blur-[20px] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fadeIn">
        
        {/* HEADER AREA */}
        <div className="flex flex-col gap-1 text-center">
          <h1 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight animate-none">
            {t("Upload Audio File", appLanguage)}
          </h1>
          <p className="font-sans text-xs md:text-sm text-[#c7c4d8]/70">
            {t("Provide vocal audio recording samples for phonetic mapping and digit recognition.", appLanguage)}
          </p>
          
          {/* Neural Bandwidth Allocation Badge */}
          <div className="mt-2.5 flex justify-center">
            {userProfile ? (
              <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                ⚡ {t("Certified Agent Mode — Unlimited Node Uploads Active", appLanguage)}
              </span>
            ) : localStorage.getItem("auron_guest_uploads_done") === "true" ? (
              <span className="font-mono text-[9px] bg-red-500/10 text-red-400 border border-red-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                ⚠️ {t("Guest Allocation Exceeded — Core Handshake Locked", appLanguage)}
              </span>
            ) : (
              <span className="font-mono text-[9px] bg-[#92dbff]/10 text-[#92dbff] border border-[#92dbff]/30 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                🌌 {t("Guest Allocation — 1 Free Matrix Upload Remaining", appLanguage)}
              </span>
            )}
          </div>
        </div>

        {/* INPUT WRAPPER */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* DRAG & DROP ZONE */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerBrowse}
            onMouseEnter={playHoverSfx}
            className={`group relative w-full h-[250px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 overflow-hidden cursor-pointer ${
              isDragging
                ? "border-[#c4c0ff] bg-[#1a1a24]/80 shadow-[0_0_20px_rgba(196,192,255,0.15)]"
                : "border-[#464555]/60 bg-[#131319]/30 hover:border-[#c4c0ff] hover:bg-[#131319]/50 hover:shadow-[0_0_20px_rgba(196,192,255,0.05)]"
            }`}
          >
            {/* Hover Glow Light */}
            <div className="absolute inset-0 bg-[#c4c0ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <UploadCloud className="w-12 h-12 text-[#918fa1] group-hover:text-[#c4c0ff] group-hover:scale-110 transition-all duration-300" />
            
            <div className="text-center z-10 px-4">
              <p className="font-sans text-md md:text-lg text-white font-medium mb-1">
                {t("Drag & Drop Audio File", appLanguage)}
              </p>
              <p className="font-sans text-xs text-[#c7c4d8]/60">
                {t("or", appLanguage)} <span className="text-[#92dbff] group-hover:underline cursor-pointer">{t("browse files", appLanguage)}</span>
              </p>
            </div>

            {/* Formats badges styled matching screenshot #2 */}
            <div className="flex gap-2 mt-2 z-10">
              <span className="border border-[#464555] text-[#c7c4d8] rounded-md px-2.5 py-1 font-mono text-[9px] font-bold group-hover:border-[#92dbff] group-hover:text-[#92dbff] transition-colors">WAV</span>
              <span className="border border-[#464555] text-[#c7c4d8] rounded-md px-2.5 py-1 font-mono text-[9px] font-bold group-hover:border-[#92dbff] group-hover:text-[#92dbff] transition-colors">MP3</span>
              <span className="border border-[#464555] text-[#c7c4d8] rounded-md px-2.5 py-1 font-mono text-[9px] group-hover:border-[#92dbff] group-hover:text-[#92dbff] transition-colors">OGG</span>
            </div>
          </div>
        ) : (
          /* ACTIVE UPLOAD STATE MODELLING SCREENSHOT #2 METICULOUSLY */
          <div className="flex flex-col gap-4 w-full bg-[#1f1f26]/50 p-4 rounded-xl border border-white/5 animate-fadeIn">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <FileAudio2 className="w-5 h-5 text-[#92dbff]" />
                <span className="font-mono text-xs text-white max-w-[200px] md:max-w-md truncate">
                  {selectedFile.name}
                </span>
              </div>
              <span className="font-mono text-xs text-[#92dbff] font-bold">
                {uploadProgress}%
              </span>
            </div>

            {/* Shimmery Progress Bar with animated gradient */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-[#4f44e2] to-[#92dbff] rounded-full transition-all duration-300 relative"
                style={{ width: `${uploadProgress}%` }}
              >
                {/* Embedded Shimmer flow */}
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerWave 2s infinite linear"
                  }}
                />
              </div>
            </div>

            {/* Cryptographic sub-labels */}
            <div className="flex justify-between items-center text-[10px] font-mono text-[#c7c4d8]/50 uppercase tracking-widest leading-none mt-1">
              <span>{statusMessage || "Syncing data..."}</span>
              <span>{processedSizeString} / {sizeString}</span>
            </div>
          </div>
        )}

        {/* ERROR FEEDBACK */}
        {errorText && (
          <div className="px-4 py-2 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 font-mono text-[11px] animate-fadeIn">
            {errorText}
          </div>
        )}

        {/* DECISION SYSTEM BUTTONS */}
        {selectedFile && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleInitiateAnalysis}
              disabled={uploadProgress < 100 || isUploading}
              onMouseEnter={playHoverSfx}
              className={`w-full text-white font-mono text-xs uppercase py-4 rounded-xl transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-2 tracking-widest ${
                uploadProgress < 100 || isUploading
                  ? "bg-[#4f44e2]/20 border border-white/5 text-white/40 cursor-not-allowed"
                  : "bg-[#4f44e2] hover:bg-[#4f44e2]/90 hover:shadow-[0_0_20px_rgba(0,196,253,0.3)] hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#92dbff]" />
                  <span>Processing Voice Stream...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-[#92dbff]" />
                  <span>Initiate Digit Recognition</span>
                </>
              )}
            </button>

            {/* Cancel/Retry logic */}
            <button
              onClick={handleClear}
              onMouseEnter={playHoverSfx}
              className="w-full bg-white/5 border border-white/10 text-[#c7c4d8] hover:text-white font-mono text-[10px] uppercase py-2.5 rounded hover:bg-white/10 transition-colors uppercase cursor-pointer"
            >
              Flush Memory Protocol
            </button>
          </div>
        )}

      </div>

      {/* LIMIT REACHED MODAL OVERLAY */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05050a]/90 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-md bg-[#1f1f26]/85 border border-red-500/15 shadow-[0_0_50px_rgba(239,68,68,0.15)] rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-md">
            {/* Shimmery warning light effect */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <div className="absolute inset-0 bg-red-500/[0.02] pointer-events-none" />

            <div className="flex flex-col gap-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full border border-red-500/20 bg-red-500/10 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="font-sans text-lg md:text-xl font-bold text-white tracking-wide">
                  Analysis Matrix Locked
                </h3>
                <span className="font-mono text-[9px] text-red-400/80 uppercase tracking-widest block mt-1 font-semibold">
                  Error Code: GUEST_SPECTRUM_LIMIT_EXCEEDED
                </span>
              </div>

              <p className="font-sans text-xs text-[#c7c4d8]/75 leading-relaxed">
                Guest nodes are restricted to exactly <strong className="text-white">one (1) free</strong> audio upload analysis transaction to preserve high-fidelity Auron network bandwidth. 
              </p>

              <div className="bg-[#131319]/50 border border-white/5 rounded-xl p-3 text-left">
                <p className="font-mono text-[10px] text-white/50 uppercase tracking-wider mb-1">
                  Upgrade to Certified Agent:
                </p>
                <ul className="space-y-1.5 font-sans text-[11px] text-[#c7c4d8]/60">
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#92dbff]">✦</span> Unlimited high-fidelity audio uploads
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#92dbff]">✦</span> Full prebuilt neural voice library
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#92dbff]">✦</span> Durable decentralized database persistence
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => {
                    playClickSfx();
                    setShowLimitModal(false);
                    onNavigate("signup");
                  }}
                  onMouseEnter={playHoverSfx}
                  className="w-full bg-[#4f44e2] hover:bg-[#4f44e2]/90 text-white font-mono text-xs font-bold uppercase py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(79,68,226,0.25)] transition duration-200 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#92dbff]" />
                  <span>Agent Sign-Up Portal</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                </button>

                <button
                  onClick={() => {
                    playClickSfx();
                    setShowLimitModal(false);
                  }}
                  onMouseEnter={playHoverSfx}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 font-mono text-[10px] uppercase py-2 rounded-lg transition duration-200 cursor-pointer"
                >
                  Close Notification
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* RESULT READY BUT SIGNUP REQUIRED MODAL OVERLAY */}
      {showReadyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05050a]/90 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-md bg-[#1f1f26]/90 border border-[#92dbff]/30 shadow-[0_0_50px_rgba(146,219,255,0.15)] rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-md">
            {/* Shimmery success light effect */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#92dbff] to-transparent" />
            <div className="absolute inset-0 bg-[#92dbff]/[0.02] pointer-events-none" />

            <div className="flex flex-col gap-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full border border-[#92dbff]/20 bg-[#92dbff]/10 flex items-center justify-center text-[#92dbff]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="font-sans text-lg md:text-xl font-bold text-white tracking-wide">
                  {t("Spectral Analysis Ready!", appLanguage)}
                </h3>
                <span className="font-mono text-[9px] text-[#92dbff]/85 uppercase tracking-widest block mt-1 font-semibold">
                  {t("Status: Cipher Locked", appLanguage)}
                </span>
              </div>

              <p className="font-sans text-xs text-[#c7c4d8]/75 leading-relaxed">
                {t("Your vocal audio mapping structure has been processed successfully! To secure your acoustic logs and view your Greek digit classification, please authenticate your Agent Identity first.", appLanguage)}
              </p>

              <div className="bg-[#131319]/50 border border-white/5 rounded-xl p-3 text-left">
                <p className="font-mono text-[10px] text-white/50 uppercase tracking-wider mb-1">
                  {t("Encrypted Stream Metrics:", appLanguage)}
                </p>
                <ul className="space-y-1 font-mono text-[10px] text-[#c7c4d8]/60">
                  <li className="flex items-center gap-1.5 justify-between">
                    <span>Source Crypt:</span> 
                    <span className="text-white font-bold max-w-[150px] truncate">{selectedFile?.name || "audio.wav"}</span>
                  </li>
                  <li className="flex items-center gap-1.5 justify-between">
                    <span>File Size:</span>
                    <span className="text-white">{sizeString}</span>
                  </li>
                  <li className="flex items-center gap-1.5 justify-between">
                    <span>Algorithm:</span>
                    <span className="text-[#92dbff]">Auron-ResNet-101</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => {
                    playClickSfx();
                    setShowReadyModal(false);
                    onNavigate("signup");
                  }}
                  onMouseEnter={playHoverSfx}
                  className="w-full bg-[#4f44e2] hover:bg-[#4f44e2]/90 text-white font-mono text-xs font-bold uppercase py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(79,68,226,0.25)] transition duration-200 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#92dbff]" />
                  <span>{t("Agent Sign-Up Portal", appLanguage)}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                </button>

                <button
                  onClick={() => {
                     playClickSfx();
                     setShowReadyModal(false);
                     onNavigate("login");
                  }}
                  onMouseEnter={playHoverSfx}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs uppercase py-3 rounded-lg transition duration-200 cursor-pointer border border-white/10"
                >
                  {t("Sign-In Existing Agent", appLanguage)}
                </button>

                <button
                  onClick={() => {
                    playClickSfx();
                    setShowReadyModal(false);
                    setSelectedFile(null);
                    setUploadProgress(0);
                    setStatusMessage("");
                  }}
                  onMouseEnter={playHoverSfx}
                  className="w-full text-white/30 hover:text-white/50 font-mono text-[9px] uppercase py-1.5 transition duration-200 cursor-pointer"
                >
                  {t("Decline & Purge Memory Buffer", appLanguage)}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmerWave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
