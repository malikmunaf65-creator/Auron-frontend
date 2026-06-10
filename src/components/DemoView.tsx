import { useState, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { playClickSfx, playHoverSfx, speakTextOffline } from "@/src/utils/audio";
import { DigitHistory, GREEK_ALPHABET, VoiceSettings } from "@/src/types";
import { getTranslatedPhonetic } from "@/src/utils/languages";

interface DemoViewProps {
  onAddHistory: (record: DigitHistory) => void;
  voiceSettings: VoiceSettings;
  appLanguage?: string;
}

export default function DemoView({ onAddHistory, voiceSettings, appLanguage = "English (US)" }: DemoViewProps) {
  const [sysFreq, setSysFreq] = useState(432.8);
  const [activeDigit, setActiveDigit] = useState<number | null>(null);
  const [isPlayingTts, setIsPlayingTts] = useState<number | null>(null);
  const [consoleLog, setConsoleLog] = useState("Awaiting interactive input...");

  useEffect(() => {
    const handle = setInterval(() => {
      setSysFreq((prev) => parseFloat((prev + (Math.random() * 1.6 - 0.8)).toFixed(1)));
    }, 1500);
    return () => clearInterval(handle);
  }, []);

  const handleDigitTrigger = async (digit: number) => {
    playClickSfx();
    setActiveDigit(digit);
    setIsPlayingTts(digit);
    const subtitle = getTranslatedPhonetic(digit);
    setConsoleLog(`Querying AURON backend for digit ${digit}...`);

    try {
      // ✅ Call real Python backend via Node proxy
      const res = await fetch("/api/sample/" + digit);
      const data = await res.json();

      const newRecord: DigitHistory = {
        id: `demo_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        digit: data.digit,
        english: data.english,
        greek: data.greek || subtitle,
        confidence: data.confidence,
        analysis: data.analysis,
        filename: `demo_sample_${digit}.wav`,
        durationSecs: 1.2,
        isLive: false,
        isMock: data.isMock || false
      };

      onAddHistory(newRecord);
      setConsoleLog(`✅ Real prediction: ${data.digit} (${data.english}) — ${(data.confidence * 100).toFixed(1)}%`);
      speakTextOffline(data.english || subtitle, voiceSettings.ttsVoice);

    } catch (err) {
      console.error("Demo prediction failed:", err);
      setConsoleLog("Backend unavailable — using offline fallback");
      speakTextOffline(subtitle, voiceSettings.ttsVoice);
    } finally {
      setIsPlayingTts(null);
      setTimeout(() => setActiveDigit(null), 200);
    }
  };

  const digits = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="relative z-10 flex-grow flex flex-col items-center justify-center pt-24 pb-12 px-6 select-none animate-fadeIn">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="font-sans text-2xl md:text-4xl text-primary font-semibold mb-2 drop-shadow-[0_0_12px_rgba(196,192,255,0.4)]">
          Interactive Array
        </h1>
        <p className="font-mono text-xs text-[#c7c4d8]/70 flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4 text-[#92dbff]" />
          Test with real sample audio — click any digit key
        </p>
      </div>

      <div className="bg-[#131319]/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-4xl relative">
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#c4c0ff]/40 rounded-tl-2xl"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#c4c0ff]/40 rounded-tr-2xl"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#c4c0ff]/40 rounded-bl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#c4c0ff]/40 rounded-br-2xl"></div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 md:gap-5">
          {digits.map((digit) => {
            const config = GREEK_ALPHABET[digit];
            const isSelected = activeDigit === digit;
            const isPlaying = isPlayingTts === digit;

            return (
              <button
                key={digit}
                onClick={() => handleDigitTrigger(digit)}
                onMouseEnter={playHoverSfx}
                style={{
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: isSelected ? "scale(0.95)" : "translateY(0)"
                }}
                className={`glow-${digit} neon-pill group flex flex-col items-center justify-center py-6 md:py-8 bg-[#1f1f26]/30 border border-white/5 hover:bg-[#1f1f26]/60 rounded-full cursor-pointer relative overflow-hidden`}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{ backgroundColor: config.color }}
                />
                {isPlaying ? (
                  <Loader2 className="w-10 h-10 md:w-14 md:h-14 text-white animate-spin my-1" />
                ) : (
                  <span
                    className="font-sans text-4xl md:text-5xl font-bold text-white group-hover:scale-105 transition-transform duration-300"
                    style={{ textShadow: `0 0 10px rgba(255,255,255,0.15)` }}
                  >
                    {digit}
                  </span>
                )}
                <span className="font-mono text-[9px] text-[#c7c4d8]/40 mt-1 uppercase tracking-widest group-hover:text-white transition-colors duration-300">
                  {getTranslatedPhonetic(digit)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-[#c7c4d8]/40 tracking-wider gap-3">
          <div className="flex gap-4 items-center">
            <span className="text-[#92dbff]">SYS.FREQ: {sysFreq} Hz</span>
            <span className="hidden md:inline-block text-white/10">|</span>
            <span className="truncate max-w-sm md:max-w-md text-left text-white/30 lowercase">
              log_trace: {consoleLog}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#92dbff] font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#92dbff] animate-ping" />
            AWAITING INPUT
          </div>
        </div>
      </div>

      <style>{`
        .glow-0:hover { border-color: #c4c0ff !important; box-shadow: 0 0 20px rgba(196, 192, 255, 0.3) !important; color: #c4c0ff !important; transform: translateY(-4px) !important; }
        .glow-1:hover { border-color: #92dbff !important; box-shadow: 0 0 20px rgba(146, 219, 255, 0.3) !important; color: #92dbff !important; transform: translateY(-4px) !important; }
        .glow-2:hover { border-color: #ffb3ae !important; box-shadow: 0 0 20px rgba(255, 179, 174, 0.3) !important; color: #ffb3ae !important; transform: translateY(-4px) !important; }
        .glow-3:hover { border-color: #4f44e2 !important; box-shadow: 0 0 20px rgba(79, 68, 226, 0.25) !important; color: #c4c0ff !important; transform: translateY(-4px) !important; }
        .glow-4:hover { border-color: #00c4fd !important; box-shadow: 0 0 20px rgba(0, 196, 253, 0.3) !important; color: #00c4fd !important; transform: translateY(-4px) !important; }
        .glow-5:hover { border-color: #ff5352 !important; box-shadow: 0 0 20px rgba(255, 83, 82, 0.3) !important; color: #ff5352 !important; transform: translateY(-4px) !important; }
        .glow-6:hover { border-color: #8781ff !important; box-shadow: 0 0 20px rgba(135, 129, 255, 0.3) !important; color: #8781ff !important; transform: translateY(-4px) !important; }
        .glow-7:hover { border-color: #6dd2ff !important; box-shadow: 0 0 20px rgba(109, 210, 255, 0.3) !important; color: #6dd2ff !important; transform: translateY(-4px) !important; }
        .glow-8:hover { border-color: #ffdad7 !important; box-shadow: 0 0 20px rgba(255, 218, 215, 0.3) !important; color: #ffdad7 !important; transform: translateY(-4px) !important; }
        .glow-9:hover { border-color: #e3dfff !important; box-shadow: 0 0 20px rgba(227, 223, 255, 0.3) !important; color: #e3dfff !important; transform: translateY(-4px) !important; }
      `}</style>
    </div>
  );
}
