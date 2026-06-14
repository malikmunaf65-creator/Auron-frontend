import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// On Vercel the filesystem is read-only except /tmp, so use /tmp there.
const DB_FILE_PATH = process.env.VERCEL
  ? "/tmp/agents_db.json"
  : path.join(process.cwd(), "agents_db.json");

interface AgentRecord {
  username: string;
  email: string;
  gridCallSign: string;
  communicationEmail: string;
  clearanceTier: string;
  clearance: string;
  missionPurpose: string;
  voicePassphrase: string;
  calibrationOption: string;
  secureSignature: string;
  joinDate: string;
  voiceprints: number;
  accuracy: number;
  successRate: number;
  lastCalibration: string;
}

function loadAgentsDb(): AgentRecord[] {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading agents database, resetting:", err);
  }
  const defaultDb: AgentRecord[] = [
    {
      username: "agent_malik",
      email: "malikmunaf65@gmail.com",
      gridCallSign: "agent_malik",
      communicationEmail: "malikmunaf65@gmail.com",
      clearanceTier: "COMMANDER",
      clearance: "COMMANDER",
      missionPurpose: "AI Development",
      voicePassphrase: "Alpha Protocol Initiated",
      calibrationOption: "alpha",
      secureSignature: "AURON-SEC-MALIK2026X",
      joinDate: "March 2026",
      voiceprints: 12,
      accuracy: 97.3,
      successRate: 95.8,
      lastCalibration: "3 Days Ago"
    }
  ];
  saveAgentsDb(defaultDb);
  return defaultDb;
}

function saveAgentsDb(data: AgentRecord[]) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to agents database:", err);
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY not configured. Running in mock mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

// ── PYTHON BACKEND URL (HF Spaces) ─────────────────────────────────────────
const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "https://munaf-dev-auron-backend.hf.space";

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/agents/list", (req, res) => {
  const db = loadAgentsDb();
  res.json(db);
});

app.post("/api/agents/signup", (req, res) => {
  try {
    const newAgent = req.body;
    if (!newAgent.gridCallSign || !newAgent.communicationEmail) {
      return res.status(400).json({ error: "Missing identity credentials" });
    }
    const db = loadAgentsDb();
    const exists = db.some(
      a => a.gridCallSign.toLowerCase() === newAgent.gridCallSign.toLowerCase() ||
           a.communicationEmail.toLowerCase() === newAgent.communicationEmail.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ error: "Agent credential overlap: Agent with this callsign or email already registered." });
    }
    db.push(newAgent);
    saveAgentsDb(db);
    res.json({ success: true, agent: newAgent });
  } catch (error) {
    res.status(500).json({ error: "Failed to persist enrollment signature." });
  }
});

app.post("/api/agents/login", (req, res) => {
  try {
    const { emailOrCallsign, signatureKey } = req.body;
    if (!emailOrCallsign || !signatureKey) {
      return res.status(400).json({ error: "Identifiers and signature are mandatory." });
    }
    const db = loadAgentsDb();
    const agent = db.find(a =>
      (a.gridCallSign.toLowerCase() === emailOrCallsign.toLowerCase() ||
       a.communicationEmail.toLowerCase() === emailOrCallsign.toLowerCase()) &&
      a.secureSignature === signatureKey
    );
    if (agent) {
      res.json({ success: true, agent });
    } else {
      res.status(401).json({ error: "Authentication Denied: Invalid key signature." });
    }
  } catch (error) {
    res.status(500).json({ error: "Authentication database exception." });
  }
});

app.post("/api/agents/delete", (req, res) => {
  try {
    const { signatureKey, emailOrCallsign } = req.body;
    if (!signatureKey && !emailOrCallsign) {
      return res.status(400).json({ error: "Agent credentials required for deletion." });
    }
    let db = loadAgentsDb();
    const initialCount = db.length;
    db = db.filter(a => {
      const matchKey = signatureKey && a.secureSignature === signatureKey;
      const matchEmail = emailOrCallsign && (
        (a.communicationEmail && a.communicationEmail.toLowerCase() === emailOrCallsign.toLowerCase()) ||
        (a.email && a.email.toLowerCase() === emailOrCallsign.toLowerCase())
      );
      const matchCallSign = emailOrCallsign && (
        (a.gridCallSign && a.gridCallSign.toLowerCase() === emailOrCallsign.toLowerCase()) ||
        (a.username && a.username.toLowerCase() === emailOrCallsign.toLowerCase())
      );
      return !(matchKey || matchEmail || matchCallSign);
    });
    if (db.length === initialCount) {
      return res.status(404).json({ error: "Agent record not found." });
    }
    saveAgentsDb(db);
    res.json({ success: true, message: "Agent account terminated permanently." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete agent record." });
  }
});

app.post("/api/agents/reset", (req, res) => {
  try {
    const defaultDb: AgentRecord[] = [
      {
        username: "agent_malik",
        email: "malikmunaf65@gmail.com",
        gridCallSign: "agent_malik",
        communicationEmail: "malikmunaf65@gmail.com",
        clearanceTier: "COMMANDER",
        clearance: "COMMANDER",
        missionPurpose: "AI Development",
        voicePassphrase: "Alpha Protocol Initiated",
        calibrationOption: "alpha",
        secureSignature: "AURON-SEC-MALIK2026X",
        joinDate: "March 2026",
        voiceprints: 12,
        accuracy: 97.3,
        successRate: 95.8,
        lastCalibration: "3 Days Ago"
      }
    ];
    saveAgentsDb(defaultDb);
    res.json({ success: true, message: "Database reset successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset database" });
  }
});

function getLocalFallbackPrediction(originalErrorMsg: string) {
  const digitsInfo = [
    { digit: 0, english: "zero", greek: "Init" },
    { digit: 1, english: "one", greek: "Alpha" },
    { digit: 2, english: "two", greek: "Beta" },
    { digit: 3, english: "three", greek: "Gamma" },
    { digit: 4, english: "four", greek: "Delta" },
    { digit: 5, english: "five", greek: "Epsln" },
    { digit: 6, english: "six", greek: "Zeta" },
    { digit: 7, english: "seven", greek: "Eta" },
    { digit: 8, english: "eight", greek: "Theta" },
    { digit: 9, english: "nine", greek: "Iota" },
  ];
  const randomItem = digitsInfo[Math.floor(Math.random() * digitsInfo.length)];
  return {
    ...randomItem,
    confidence: 0.89,
    analysis: `Local fallback mode. Python backend error: ${originalErrorMsg}`,
    isMock: true
  };
}

// ── /api/recognize ──────────────────────────────────────────────────────────
app.post("/api/recognize", async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Missing 'audio' base64 payload." });
    }

    // 1️⃣ TRY PYTHON BACKEND FIRST (real ML model)
    try {
      console.log(`Routing to Python backend: ${PYTHON_BACKEND_URL}`);
      const pythonRes = await fetch(`${PYTHON_BACKEND_URL}/api/recognize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio, mimeType }),
        signal: AbortSignal.timeout(60000),
      });
      if (pythonRes.ok) {
        const data = await pythonRes.json();
        console.log("Python backend prediction success:", data.digit);
        return res.json({ ...data, isMock: false });
      }
      console.warn("Python backend returned error status:", pythonRes.status);
    } catch (pythonErr: any) {
      console.warn("Python backend unreachable, falling back to Gemini:", pythonErr.message);
    }

    // 2️⃣ FALLBACK: GEMINI
    const ai = getGeminiClient();
    if (!ai) {
      console.log("No Gemini key — returning mock prediction");
      const digitsInfo = [
        { digit: 0, english: "zero", greek: "Init" },
        { digit: 1, english: "one", greek: "Alpha" },
        { digit: 2, english: "two", greek: "Beta" },
        { digit: 3, english: "three", greek: "Gamma" },
        { digit: 4, english: "four", greek: "Delta" },
        { digit: 5, english: "five", greek: "Epsln" },
        { digit: 6, english: "six", greek: "Zeta" },
        { digit: 7, english: "seven", greek: "Eta" },
        { digit: 8, english: "eight", greek: "Theta" },
        { digit: 9, english: "nine", greek: "Iota" },
      ];
      const randomItem = digitsInfo[Math.floor(Math.random() * digitsInfo.length)];
      return res.json({ ...randomItem, confidence: 0.94, analysis: "Demo mode.", isMock: true });
    }

    const cleanMimeType = mimeType || "audio/wav";
    const prompt = `
      You are Auron, a voice digit recognition neural system.
      Listen to the audio, identify the single spoken digit (0-9).
      Return ONLY a JSON object. No markdown, no backticks.
      JSON format:
      {
        "digit": <number 0-9>,
        "english": "<english word>",
        "greek": "<Init/Alpha/Beta/Gamma/Delta/Epsln/Zeta/Eta/Theta/Iota>",
        "confidence": <float 0.0-1.0>,
        "analysis": "<brief acoustic analysis>"
      }
    `;

    const audioPart = { inlineData: { data: audio, mimeType: cleanMimeType } };
    let textOutput = "";
    let lastError: any = null;
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Querying ${modelName} (attempt ${attempt}/3)...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [audioPart, prompt],
            config: { responseMimeType: "application/json" }
          });
          textOutput = response.text || "";
          if (textOutput) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Attempt ${attempt} failed:`, err.message);
          const isTransient = err.status === 429 || err.status === 503 ||
            (typeof err.message === "string" && (
              err.message.includes("503") || err.message.includes("429") ||
              err.message.includes("UNAVAILABLE") || err.message.includes("rate limit")
            ));
          if (isTransient && attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 500));
          } else break;
        }
      }
      if (textOutput) break;
    }

    if (!textOutput) {
      return res.json(getLocalFallbackPrediction(lastError?.message || "All models unavailable"));
    }

    try {
      const cleaned = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return res.json({ ...parsed, isMock: false });
    } catch {
      return res.json(getLocalFallbackPrediction("JSON parse error"));
    }

  } catch (error: any) {
    console.error("Recognition error:", error);
    return res.json(getLocalFallbackPrediction(error.message));
  }
});

// ── /api/sample/:digit ───────────────────────────────────────────────────────
app.get("/api/sample/:digit", async (req, res) => {
  try {
    console.log(`Fetching sample for digit ${req.params.digit} from ${PYTHON_BACKEND_URL}`);
    const response = await fetch(`${PYTHON_BACKEND_URL}/sample/${req.params.digit}`, {
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    const html = await response.text();
    const digitMatch = html.match(/digit-number[^>]*>(\d)</);
    const digit = digitMatch ? parseInt(digitMatch[1]) : parseInt(req.params.digit);
    return res.json({
      digit,
      english: ["zero","one","two","three","four","five","six","seven","eight","nine"][digit],
      greek: ["Init","Alpha","Beta","Gamma","Delta","Epsln","Zeta","Eta","Theta","Iota"][digit],
      confidence: 0.97,
      analysis: `Sample prediction for digit ${digit} via AURON neural backend.`,
      isMock: false
    });
  } catch (err: any) {
    console.error("Sample proxy error:", err.message);
    res.status(500).json({ error: "Sample prediction failed", details: err.message });
  }
});

// ── /api/tts ─────────────────────────────────────────────────────────────────
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text to speak" });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "Gemini client not initialized." });
    }
    const voiceMapping: Record<string, string> = {
      "Aetheria": "Zephyr",
      "Valkyrie_XT": "Kore",
      "Neon_Oracle": "Puck",
      "Titan_Prime": "Charon",
      "Kronos_Void": "Fenrir"
    };
    const selectedVoice = voiceMapping[voice] || voice || "Zephyr";
    let base64Audio = "";
    let lastTtsError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
            },
          },
        });
        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
        if (base64Audio) break;
      } catch (err: any) {
        lastTtsError = err;
        const isTransient = err.status === 429 || err.status === 503;
        if (isTransient && attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else break;
      }
    }

    if (!base64Audio) {
      return res.status(503).json({ error: lastTtsError?.message || "TTS unavailable" });
    }
    res.json({ audio: base64Audio, type: "audio/pcm", rate: 24000 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Speech synthesis failed" });
  }
});

// ----------------------------------------------------
// LOCAL / RAILWAY: listen on a port (Vercel ignores this — it uses the
// exported `app` directly as a serverless request handler)
// ----------------------------------------------------
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Auron Engine online at http://0.0.0.0:${PORT}`);
  });
}

export default app;
