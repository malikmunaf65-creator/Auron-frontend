import { useState, useEffect, useRef } from "react";
import { Play, Volume2, Trash2, ShieldCheck, Cpu, Clock, HardDrive, Sparkles, BarChart2, Activity } from "lucide-react";
import { playClickSfx, playHoverSfx, playSuccessSfx, speakTextOffline } from "@/src/utils/audio";
import { DigitHistory, GREEK_ALPHABET, VoiceSettings, FUTURISTIC_VOICES, TtsVoice } from "@/src/types";
import { getTranslatedPhonetic, getCurrentLanguage } from "@/src/utils/languages";

interface ResultsViewProps {
  history: DigitHistory[];
  onClearHistory: () => void;
  voiceSettings?: VoiceSettings;
  appLanguage?: string;
}

export default function ResultsView({ history, onClearHistory, voiceSettings, appLanguage = "English (US)" }: ResultsViewProps) {
  const [selectedItem, setSelectedItem] = useState<DigitHistory | null>(
    history.length > 0 ? history[0] : null
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isSynthesizingVoice, setSynthesizingVoice] = useState<string | null>(null);

  const activeItem = selectedItem || (history.length > 0 ? history[0] : null);

  // Track which item we already auto-played so we never fire twice
  const lastAutoPlayedIdRef = useRef<string | null>(null);

  const speakActiveDigit = async (voiceId: string) => {
    if (!activeItem) return;
    playClickSfx();
    const speechText = `${activeItem.digit}, ${getTranslatedPhonetic(activeItem.digit)}`;
    const mode = voiceSettings?.engineMode || "offline";

    let rate = 1.0;
    if (voiceId === "Aetheria") rate = 0.90;
    else if (voiceId === "Valkyrie_XT") rate = 1.15;
    else if (voiceId === "Neon_Oracle") rate = 1.40;
    else if (voiceId === "Titan_Prime") rate = 0.72;
    else if (voiceId === "Kronos_Void") rate = 0.82;

    if (mode === "gemini" || mode === "alternative") {
      setSynthesizingVoice(voiceId);
      const isAlt = mode === "alternative";
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechText, voice: voiceId }),
        });
        if (!res.ok) throw new Error("TTS Failure");
        const json = await res.json();
        const audioSrc = `data:audio/wav;base64,${json.audio}`;
        const audio = new Audio(audioSrc);
        audio.playbackRate = isAlt ? rate * 1.25 : rate;
        await audio.play();
      } catch (err) {
        console.warn("Server TTS failed, falling back to local speech engine.");
        speakTextOffline(speechText, voiceId);
      } finally {
        setSynthesizingVoice(null);
      }
    } else {
      setSynthesizingVoice(voiceId);
      speakTextOffline(speechText, voiceId);
      setTimeout(() => setSynthesizingVoice(null), 1200);
    }
  };

  const handlePlaySavedAudio = (item: DigitHistory, quiet: boolean = false) => {
    if (!item.audioData) return;
    if (!quiet) playClickSfx();
    setPlayingId(item.id);
    const audio = new Audio(item.audioData);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
  };

  // ─── AUTO-PLAY on new activeItem ──────────────────────────────────────────
  // Rules:
  //   • Only fire once per unique item id (ref guard)
  //   • LIVE mic recordings → play saved audio (it came from mic, no prior playback)
  //   • Upload items      → play saved audio (user wants to hear what they uploaded)
  //   • Demo items        → do NOT speak — DemoView already called speakTextOffline
  //     before navigating here, so we stay silent to avoid the double-speak bug.
  useEffect(() => {
    if (!activeItem) return;
    if (activeItem.id === lastAutoPlayedIdRef.current) return; // already handled

    lastAutoPlayedIdRef.current = activeItem.id;

    if (activeItem.isLive) {
      // Live mic recording — play the raw audio blob
      if (activeItem.audioData) {
        handlePlaySavedAudio(activeItem, true);
      } else {
        speakActiveDigit(voiceSettings?.ttsVoice || "Aetheria");
      }
    } else if (!activeItem.isLive && activeItem.audioData && !activeItem.id.startsWith("demo_")) {
      // Upload — play the uploaded file
      handlePlaySavedAudio(activeItem, true);
    }
    // Demo items (id starts with "demo_") → silent, already spoken in DemoView
  }, [activeItem?.id]); // depend only on the id, not voiceSettings

  const handleSelect = (item: DigitHistory) => {
    playClickSfx();
    setSelectedItem(item);
  };

  const totalCount = history.length;
  const confidenceAvg =
    totalCount > 0
      ? parseFloat(
          (history.reduce((acc, curr) => acc + curr.confidence, 0) / totalCount * 100).toFixed(1)
        )
      : 0;
  const liveCount = history.filter((h) => h.isLive).length;
  const uploadCount = totalCount - liveCount;

  return (
    <div className="flex-grow w-full max-w-6xl mx-auto px-6 pt-24 pb-12 relative z-10 flex flex-col gap-8 animate-fadeIn select-none">

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        <div className="bg-[#1f1f26]/30 border border-white/5 rounded-xl p-4 flex flex-col gap-1 text-left relative overflow-hidden">
          <span className="font-mono text-[9px] text-[#c7c4d8]/40 uppercase tracking-widest">Total Ingested</span>
          <span className="font-sans text-2xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#c4c0ff]" />
            {totalCount} Vectors
          </span>
        </div>
        <div className="bg-[#1f1f26]/30 border border-white/5 rounded-xl p-4 flex flex-col gap-1 text-left">
          <span className="font-mono text-[9px] text-[#c7c4d8]/40 uppercase tracking-widest">Aura Accuracy index</span>
          <span className="font-sans text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#92dbff]" />
            {confidenceAvg}% Avg
          </span>
        </div>
        <div className="bg-[#1f1f26]/30 border border-white/5 rounded-xl p-4 flex flex-col gap-1 text-left">
          <span className="font-mono text-[9px] text-[#c7c4d8]/40 uppercase tracking-widest">Live Transmissions</span>
          <span className="font-sans text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#ff5352]" />
            {liveCount} Recs
          </span>
        </div>
        <div className="bg-[#1f1f26]/30 border border-white/5 rounded-xl p-4 flex flex-col gap-1 text-left">
          <span className="font-mono text-[9px] text-[#c7c4d8]/40 uppercase tracking-widest">Upload Batches</span>
          <span className="font-sans text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8781ff]" />
            {uploadCount} Ingests
          </span>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="w-full bg-[#1f1f26]/20 border border-dashed border-[#464555]/30 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 py-20">
          <BarChart2 className="w-16 h-16 text-[#c7c4d8]/20 animate-pulse" />
          <div className="text-center">
            <h2 className="font-sans text-lg font-semibold text-[#c7c4d8]/80 mb-1">Spectroscopic Database Vacant</h2>
            <p className="font-mono text-xs text-[#c7c4d8]/40 max-w-md mx-auto">
              No voice recordings detected. Trigger actual vocal packets via "Home" tab or dial elements on "Demo" grid to generate records.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT — DETAILED VIEW */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {activeItem && (
              <div className="bg-[#1f1f26]/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fadeIn relative overflow-hidden">
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#92dbff]/30 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#92dbff]/30 rounded-tr-xl" />

                <div className="flex justify-between items-center w-full font-mono text-[9px] text-[#c7c4d8]/30 uppercase tracking-widest">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#92dbff]" />
                    INTEGRATED AURON TRANSLATOR MATCH
                  </span>
                  <span>{activeItem.timestamp}</span>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="w-32 h-32 rounded-full border bg-[#05050a] flex items-center justify-center animate-wave-float relative shadow-[0_0_40px_rgba(196,192,255,0.06)]"
                      style={{
                        borderColor: GREEK_ALPHABET[activeItem.digit]?.color || "#ffffff",
                        boxShadow: `0 0 35px 5px ${GREEK_ALPHABET[activeItem.digit]?.hoverColor}`,
                      }}
                    >
                      <span className="font-sans text-7xl font-bold text-white">{activeItem.digit}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 text-center md:text-left">
                    <div>
                      <span className="font-mono text-[9px] text-secondary tracking-widest uppercase block mb-0.5">
                        {getCurrentLanguage()} paradigm mapping
                      </span>
                      <h2 className="font-sans text-3xl font-bold text-white uppercase tracking-tight">
                        {getTranslatedPhonetic(activeItem.digit)}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
                      <div>
                        <span className="text-white/30 text-[10px] block uppercase">confidence</span>
                        <span className="text-[#92dbff] font-bold">{(activeItem.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-white/30 text-[10px] block uppercase">pronunciation</span>
                        <span className="text-[#c7c4d8] uppercase">{activeItem.english}</span>
                      </div>
                      <div>
                        <span className="text-white/30 text-[10px] block uppercase">acoustic time</span>
                        <span className="text-[#c7c4d8] font-bold">{activeItem.durationSecs}s</span>
                      </div>
                      <div>
                        <span className="text-white/30 text-[10px] block uppercase">transmission</span>
                        <span className="text-[#c7c4d8] flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${activeItem.isLive ? "bg-[#ff5352]" : "bg-[#c4c0ff]"}`} />
                          {activeItem.isLive ? "LIVE REC" : "UPLOAD"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#05050a]/40 border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center font-mono text-[9px] text-[#c7c4d8]/40 tracking-wider">
                    <span>Acoustic Critiques / Spectrogram metrics</span>
                    {activeItem.isMock ? (
                      <span className="text-[#ffb3ae] font-bold border border-[#ffb3ae]/25 px-1.5 py-0.5 rounded uppercase">Demonstration</span>
                    ) : (
                      <span className="text-emerald-400 font-bold border border-emerald-400/25 px-1.5 py-0.5 rounded uppercase">REAL AI</span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-[#c7c4d8]/80 leading-relaxed text-left">{activeItem.analysis}</p>
                </div>

                {/* VOCAL PLAYBACK HUB */}
                <div className="border-t border-white/5 pt-5 flex flex-col gap-4 text-left">

                  <div>
                    <span className="font-mono text-[9px] text-[#92dbff] uppercase tracking-widest block mb-1.5 font-bold">
                      1. Master Audio Broadcast (Default / Loaded)
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      {activeItem.audioData ? (
                        <button
                          onClick={() => handlePlaySavedAudio(activeItem)}
                          onMouseEnter={playHoverSfx}
                          className="flex-grow p-3 bg-white/5 border border-white/10 hover:border-[#92dbff]/30 text-white hover:text-[#92dbff] rounded-xl font-mono text-xs uppercase tracking-wider backdrop-blur transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#92dbff]" />
                            <span className="truncate max-w-[200px] sm:max-w-xs text-left">
                              Play Original: {activeItem.filename}
                            </span>
                          </span>
                          <Play className={`w-3.5 h-3.5 ${playingId === activeItem.id ? "animate-spin text-[#92dbff]" : "fill-current"}`} />
                        </button>
                      ) : (
                        <div className="flex-grow p-3 bg-white/5 border border-white/5 rounded-xl font-mono text-[10px] text-white/30 uppercase text-center flex items-center justify-center">
                          Default simulated signal stimulus (No recorded file chunks)
                        </div>
                      )}

                      <button
                        onClick={() => speakActiveDigit(voiceSettings?.ttsVoice || "Aetheria")}
                        onMouseEnter={playHoverSfx}
                        className="p-3 bg-[#4f44e2]/25 border border-[#4f44e2]/35 hover:bg-[#4f44e2]/40 rounded-xl font-mono text-xs text-[#92dbff] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        title="Vocalize using current saved model preferences"
                      >
                        <Volume2 className="w-4 h-4 text-[#92dbff]" />
                        <span>Speak Default: {voiceSettings?.ttsVoice || "Aetheria"}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-mono text-[9px] text-[#92dbff] uppercase tracking-widest block mb-1.5 font-bold">
                      2. Neural Multiverse - Interactive Voice Selection
                    </span>
                    <p className="font-sans text-[10px] text-[#c7c4d8]/40 mb-3 block leading-relaxed">
                      Select any of the specialized cybernetic or cosmic voices below. The digitized match will be compiled and broadcast automatically.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {FUTURISTIC_VOICES.map((v) => {
                        const isSpeaking = isSynthesizingVoice === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => speakActiveDigit(v.id)}
                            onMouseEnter={playHoverSfx}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between h-24 ${
                              isSpeaking
                                ? "border-[#92dbff] bg-[#92dbff]/10 shadow-[0_0_12px_rgba(146,219,255,0.2)]"
                                : "border-white/5 bg-white/3 hover:border-white/15"
                            }`}
                          >
                            <div className="flex justify-between items-start w-full gap-1">
                              <span className={`font-mono text-[10px] font-bold leading-tight ${isSpeaking ? "text-[#92dbff]" : "text-white"}`}>
                                {v.displayName.replace("🎤 ", "").replace("⚡ ", "").replace("🔮 ", "").replace("💀 ", "").replace("🌀 ", "")}
                              </span>
                              {isSpeaking ? (
                                <Activity className="w-3.5 h-3.5 text-[#92dbff] animate-pulse shrink-0" />
                              ) : (
                                <Volume2 className="w-3 h-3 text-[#c7c4d8]/40 shrink-0" />
                              )}
                            </div>
                            <span className="text-[7px] font-mono bg-white/5 text-white/50 border border-white/5 px-1 py-0.5 rounded tracking-tighter uppercase font-bold mt-1 max-w-full truncate block text-center">
                              {v.genderLabel.split(" ")[0]}
                            </span>
                            <p className="font-sans text-[8px] text-[#c7c4d8]/50 leading-tight mt-1 line-clamp-2 md:line-clamp-3">
                              {v.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — CHRONOLOGY */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center w-full">
              <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase">Chronological Packets</span>
              <button
                onClick={() => { playClickSfx(); onClearHistory(); }}
                className="text-white/40 hover:text-[#ff5352] transition font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Flush Arrays
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item) => {
                const config = GREEK_ALPHABET[item.digit];
                const isSelected = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    style={{ transition: "all 0.25s ease" }}
                    className={`p-3 border rounded-xl flex items-center justify-between text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#92dbff] bg-[#1a1a24]/80 shadow-[0_4px_15px_rgba(146,219,255,0.06)]"
                        : "border-white/5 bg-[#1f1f26]/20 hover:border-white/10 hover:bg-[#1f1f26]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center font-bold text-white text-md select-none outline-none"
                        style={{ boxShadow: `0 0 10px ${config?.hoverColor || "transparent"}` }}
                      >
                        {item.digit}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans text-xs font-semibold text-white uppercase leading-tight">
                          {getTranslatedPhonetic(item.digit)}
                        </span>
                        <span className="font-mono text-[8px] text-[#c7c4d8]/40 mt-0.5 uppercase leading-none">
                          {item.timestamp} &middot; {item.isLive ? "Live Sync" : "Batch"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-mono text-[10px] text-[#92dbff] font-semibold leading-none">
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                      {item.audioData && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlaySavedAudio(item); }}
                          className="p-1 text-white/30 hover:text-white transition cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
