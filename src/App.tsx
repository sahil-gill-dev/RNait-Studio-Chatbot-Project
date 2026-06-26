import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  MessageSquare, 
  Sparkles, 
  Sliders, 
  Trash2, 
  Send, 
  Menu, 
  X, 
  ArrowRight, 
  AlertCircle, 
  ChevronRight,
  Volume2,
  VolumeX,
  Music,
  Share2,
  Check,
  Zap,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PERSONAS } from "./personas";
import { Message, ChatSession, Persona } from "./types";
import MarkdownRenderer from "./components/MarkdownRenderer";

export default function App() {
  // Session states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  
  // Customization and configuration
  const [activePersonaId, setActivePersonaId] = useState<string>("rnait_classic");
  const [temperature, setTemperature] = useState<number>(0.8);
  const [customInstruction, setCustomInstruction] = useState<string>("");
  
  // UI states
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [apiConfig, setApiConfig] = useState<{ hasApiKey: boolean; defaultModel: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // References
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Sound Synthesizer using Web Audio API (no external file load needed!)
  const playSound = (type: "send" | "receive" | "click") => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "send") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "receive") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "click") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn("Audio Context not supported or allowed yet", e);
    }
  };

  // Check API keys and server configuration
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setApiConfig(data))
      .catch((err) => console.error("Error loading API config:", err));
  }, []);

  // Load chat sessions from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("gemini_chat_sessions_rnait");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        if (parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setActivePersonaId(parsed[0].personaId);
          setTemperature(parsed[0].temperature);
          setCustomInstruction(parsed[0].systemInstructionCustom || "");
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved sessions:", e);
      }
    }
    // If no saved sessions, initialize a default one
    createNewSession("rnait_classic");
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("gemini_chat_sessions_rnait", JSON.stringify(sessions));
    } else {
      localStorage.removeItem("gemini_chat_sessions_rnait");
    }
  }, [sessions]);

  // Scroll to bottom when messages stream or update
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, currentSessionId, isStreaming]);

  // Get active session
  const activeSession = sessions.find((s) => s.id === currentSessionId);
  const activePersona = PERSONAS.find((p) => p.id === activePersonaId) || PERSONAS[0];

  // Helper to create a new session
  const createNewSession = (personaId: string) => {
    playSound("click");
    const targetPersona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0];
    const newSession: ChatSession = {
      id: Math.random().toString(36).substring(2, 11),
      name: `Dialogue with ${targetPersona.name}`,
      messages: [],
      personaId: targetPersona.id,
      temperature: 0.8,
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActivePersonaId(targetPersona.id);
    setTemperature(0.8);
    setCustomInstruction("");
  };

  // Delete a session
  const deleteSession = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    playSound("click");
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    
    if (currentSessionId === id) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
        const nextSession = remaining[0];
        setActivePersonaId(nextSession.personaId);
        setTemperature(nextSession.temperature);
        setCustomInstruction(nextSession.systemInstructionCustom || "");
      } else {
        createNewSession("rnait_classic");
      }
    }
  };

  // Change active session
  const selectSession = (session: ChatSession) => {
    playSound("click");
    setCurrentSessionId(session.id);
    setActivePersonaId(session.personaId);
    setTemperature(session.temperature);
    setCustomInstruction(session.systemInstructionCustom || "");
    setSidebarOpen(false);
  };

  // Update session settings
  const handleUpdateSettings = (newTemp: number, newInstruction: string) => {
    setTemperature(newTemp);
    setCustomInstruction(newInstruction);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, temperature: newTemp, systemInstructionCustom: newInstruction }
          : s
      )
    );
  };

  // Switch persona of active session
  const handleSwitchPersona = (pId: string) => {
    playSound("click");
    const targetPersona = PERSONAS.find((p) => p.id === pId) || PERSONAS[0];
    setActivePersonaId(pId);
    
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          const isDefaultName = s.name.startsWith("Dialogue with");
          const newName = isDefaultName ? `Dialogue with ${targetPersona.name}` : s.name;
          return {
            ...s,
            personaId: pId,
            name: newName
          };
        }
        return s;
      })
    );
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputMessage).trim();
    if (!messageText || isStreaming || !currentSessionId) return;

    setInputMessage("");
    playSound("send");

    // Create user message
    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    // Create a temporary assistant message that will be streamed into
    const assistantMessageId = Math.random().toString(36).substring(2, 11);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    // Update session state locally first
    let updatedMessages = [...(activeSession?.messages || []), userMessage];
    
    // Auto rename discussion title on first message to a summary of the query
    let newName = activeSession?.name || `Dialogue with ${activePersona.name}`;
    if ((activeSession?.messages.length || 0) === 0) {
      newName = messageText.length > 28 ? messageText.substring(0, 25) + "..." : messageText;
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, name: newName, messages: [...updatedMessages, assistantMessage] }
          : s
      )
    );

    setIsStreaming(true);

    try {
      const conversation = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const baseInstruction = activePersona.systemInstruction;
      const combinedInstruction = customInstruction.trim()
        ? `${baseInstruction}\n\nAdditional user guidelines:\n${customInstruction}`
        : baseInstruction;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversation,
          systemInstruction: combinedInstruction,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate stream from proxy");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let partialData = "";
      let playedSound = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          partialData += chunk;

          const lines = partialData.split("\n\n");
          partialData = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  if (!playedSound) {
                    playSound("receive");
                    playedSound = true;
                  }
                  assistantMessage.content += parsed.text;

                  setSessions((prev) =>
                    prev.map((s) =>
                      s.id === currentSessionId
                        ? {
                            ...s,
                            messages: s.messages.map((m) =>
                              m.id === assistantMessageId
                                ? { ...m, content: assistantMessage.content }
                                : m
                            ),
                          }
                        : s
                    )
                  );
                }
              } catch (e) {
                console.error("Error parsing stream chunk:", e, line);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Streaming error:", err);
      assistantMessage.content = `⚠️ **Error:** ${err.message || "Please check your network and Gemini API key."}`;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantMessage.content }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleShare = () => {
    playSound("click");
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const clearCurrentChat = () => {
    playSound("click");
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [] } : s))
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A] text-slate-100 font-sans selection:bg-amber-500/35 selection:text-white relative">
      
      {/* Decorative Interactive Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.04)_0,transparent_60%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />

      {/* Mobile Header with premium dark gold look */}
      <header className="flex md:hidden w-full h-16 bg-[#121212]/90 backdrop-blur-md border-b border-amber-500/15 px-4 items-center justify-between fixed top-0 left-0 z-20">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { playSound("click"); setSidebarOpen(true); }}
            className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all duration-200"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-1.5">
            <Music className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="font-serif text-lg font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">R Nait AI</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => createNewSession(activePersonaId)}
            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-full transition-all"
            title="New Dialogue"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Sidebar - Sleek Premium Black and Dark Gold */}
      <aside 
        className={`
          fixed md:relative inset-y-0 left-0 z-30 md:z-10
          w-72 bg-[#0F0F0F] border-r border-amber-500/10
          flex flex-col transform transition-transform duration-300 ease-out
          md:transform-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar Header with gold accents */}
        <div className="p-6 border-b border-amber-500/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-black font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              RN
            </div>
            <h1 className="font-serif text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 uppercase">
              R Nait Studio
            </h1>
          </div>
          <button 
            onClick={() => { playSound("click"); setSidebarOpen(false); }}
            className="md:hidden p-1.5 text-amber-500/70 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button with motion effect */}
        <div className="px-4 py-4">
          <button
            onClick={() => {
              createNewSession("rnait_classic");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black py-3 px-4 rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>New Dialogue</span>
          </button>
        </div>

        {/* Discussions List with custom scrollbar styling */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-500/40">
            Studio History
          </div>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-xs italic text-slate-500 text-center">
              No recorded sessions.
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const sessionPersona = PERSONAS.find(p => p.id === session.personaId) || PERSONAS[0];
              return (
                <div
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`
                    group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border
                    ${isActive 
                      ? "bg-amber-500/10 text-white font-medium border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.05)]" 
                      : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"}
                  `}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="text-base select-none bg-[#1A1A1A] p-1.5 rounded-lg border border-white/5">{sessionPersona.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate leading-tight">
                        {session.name}
                      </div>
                      <div className="text-[11px] text-amber-500/50 truncate mt-0.5 font-medium">
                        {sessionPersona.title}
                      </div>
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete dialogue"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer with interactive sounds controls & credits */}
        <div className="p-4 border-t border-amber-500/10 bg-black/50 space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <button 
              onClick={() => { setSoundEnabled(!soundEnabled); playSound("click"); }}
              className="flex items-center space-x-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              title={soundEnabled ? "Mute interactive audio notes" : "Unmute interactive audio notes"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span>Audio Feedback</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                  <span>Audio Muted</span>
                </>
              )}
            </button>
            <div className="flex items-center space-x-1.5 text-amber-500/70 font-semibold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>Online</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-black text-xs font-bold select-none">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">officalgill11@gmail.com</p>
              <p className="text-[10px] text-amber-500/60 font-medium">AI Studio Creator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Canvas with pure black backgrounds */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full pt-16 md:pt-0 z-10 bg-[#060606]">
        
        {/* API warning key fallback banner */}
        {apiConfig && !apiConfig.hasApiKey && (
          <div className="bg-amber-950/40 border-b border-amber-500/20 px-6 py-2.5 flex items-center space-x-3 text-xs text-amber-200 z-10">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <strong className="font-semibold text-amber-400">Gemini Key Needed:</strong> Please add your API Key in Settings (the top right corner menu) to enable the live chatbot.
            </div>
          </div>
        )}

        {/* Header - Modern translucent black */}
        <header className="px-6 md:px-10 py-4.5 border-b border-amber-500/10 bg-black/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl select-none filter drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">{activePersona.icon}</span>
              <h2 className="font-serif text-base md:text-lg font-bold text-white tracking-wide">
                {activeSession?.name || `Dialogue with ${activePersona.name}`}
              </h2>
            </div>
            <p className="text-[11px] text-amber-500/60 mt-0.5 font-semibold uppercase tracking-wider">
              {activePersona.title} • Temp: {temperature}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Action buttons */}
            <button
              onClick={handleShare}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all duration-200 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
              title="Copy session link"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {/* Customizer Settings Toggle Button */}
            <button
              onClick={() => { playSound("click"); setShowSettings(!showSettings); }}
              className={`
                p-2 rounded-xl border transition-all duration-200 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer
                ${showSettings 
                  ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-amber-500/30"}
              `}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tune Bot</span>
            </button>
          </div>
        </header>

        {/* Dynamic Parameter Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-[#0D0D0D] border-b border-amber-500/10 p-6 z-10 shadow-lg overflow-hidden flex-shrink-0"
            >
              <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature Parameter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Vibe Control (Creativity Temp)
                    </label>
                    <span className="text-xs font-extrabold text-amber-500 px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">
                      {temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => handleUpdateSettings(parseFloat(e.target.value), customInstruction)}
                    className="w-full accent-amber-500 h-1.5 bg-[#1F1F1F] rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Direct & Precise (0.1)</span>
                    <span>Poetic & Musical (1.5)</span>
                  </div>
                </div>

                {/* Custom system directions */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    System Guidelines Customizer
                  </label>
                  <textarea
                    value={customInstruction}
                    onChange={(e) => handleUpdateSettings(temperature, e.target.value)}
                    placeholder="e.g., 'Reply in Punjabi slang', 'Keep lyrics structure standard', etc."
                    rows={2}
                    className="w-full text-xs bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                  />
                </div>

                {/* Quick actions row */}
                <div className="md:col-span-2 flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                  <button
                    onClick={clearCurrentChat}
                    className="text-xs font-semibold text-rose-400/80 hover:text-rose-400 hover:bg-rose-400/10 px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset This Chat</span>
                  </button>
                  <span className="text-[10px] text-slate-500">Tune R Nait responses using custom variables.</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Feed Display */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-6">
          {!activeSession || activeSession.messages.length === 0 ? (
            /* Immersive and animated R Nait Splash State */
            <div className="max-w-2xl mx-auto py-12 space-y-10 animate-fadeIn">
              <div className="text-center space-y-4">
                {/* Visual pulsating logo container */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative inline-block p-5 bg-[#121212] border border-amber-500/20 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.15)] text-4xl select-none">
                    {activePersona.icon}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                      {activePersona.title}
                    </span>
                  </div>
                  <h3 className="font-serif text-3xl md:text-4xl text-white font-black tracking-wide">
                    Talk to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">R Nait</span>
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto italic font-medium leading-relaxed">
                    &ldquo;{activePersona.description}&rdquo;
                  </p>
                </div>
              </div>

              {/* Mode customization selection cards */}
              <div className="bg-[#121212]/80 rounded-2xl border border-amber-500/10 p-5 shadow-lg space-y-4 relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md">
                  <Zap className="h-2.5 w-2.5 fill-black" />
                  <span>INTERACTIVE</span>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-amber-500/70 flex items-center space-x-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Choose Your Conversation Companion</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchPersona(p.id)}
                      className={`
                        p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group
                        ${activePersonaId === p.id 
                          ? "bg-amber-500/10 border-amber-500/50" 
                          : "bg-black/40 border-white/5 hover:border-amber-500/30"}
                      `}
                    >
                      <div className="flex items-center space-x-2 font-bold text-xs text-white">
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick starter questions prompts */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Popular R Nait Dialogues
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {activePersona.suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputMessage(prompt);
                        handleSendMessage(prompt);
                      }}
                      className="p-4 bg-[#121212]/50 hover:bg-[#1C1C1C]/60 rounded-xl border border-white/5 text-left text-xs text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all duration-200 shadow-md leading-relaxed cursor-pointer flex flex-col justify-between"
                    >
                      <span>{prompt}</span>
                      <div className="mt-4 flex items-center text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        <span>Send instantly</span>
                        <ChevronRight className="h-3 w-3 ml-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Render active session message streams */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((message) => {
                const isUser = message.role === "user";
                const sessionPersona = PERSONAS.find(p => p.id === activeSession.personaId) || PERSONAS[0];
                
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                  >
                    {/* Role / Name tag */}
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 select-none">
                      {isUser ? (
                        <span>You</span>
                      ) : (
                        <>
                          <span className="text-xs filter drop-shadow-[0_0_2px_rgba(245,158,11,0.5)]">{sessionPersona.icon}</span>
                          <span className="text-amber-500/90">{sessionPersona.name}</span>
                        </>
                      )}
                    </div>

                    {/* Chat Bubbles */}
                    <div
                      className={`
                        max-w-[85%] md:max-w-[80%] rounded-2xl p-5 md:p-6 shadow-xl border transition-all duration-200
                        ${isUser
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black border-amber-500 rounded-br-none shadow-amber-500/5 font-semibold"
                          : "bg-[#121212] text-slate-200 border-white/5 rounded-bl-none shadow-black/40"}
                      `}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-line text-sm md:text-base leading-relaxed">{message.content}</p>
                      ) : message.content === "" ? (
                        /* Sound wave typing indicator */
                        <div className="flex items-center space-x-1 py-1 px-2">
                          <span className="h-4.5 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-6 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-5 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '300ms' }}></span>
                          <span className="h-7 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '450ms' }}></span>
                          <span className="h-4.5 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '600ms' }}></span>
                        </div>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>

        {/* Typing & Sound Wave visualizers during stream sessions */}
        {isStreaming && (
          <div className="flex justify-center items-center space-x-2 py-2 bg-black/40 border-t border-amber-500/5 select-none text-[10px] font-bold text-amber-500 uppercase tracking-widest animate-pulse flex-shrink-0">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>R Nait is composing response...</span>
          </div>
        )}

        {/* Form area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center bg-[#121212] border border-white/5 rounded-full p-2 pl-5 pr-2.5 shadow-[0_0_30px_rgba(0,0,0,0.6)] focus-within:border-amber-500/40 focus-within:ring-1 focus-within:ring-amber-500/10 transition-all duration-200"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask ${activePersona.name} for lyrics, motivation, or coding...`}
                disabled={isStreaming}
                className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-600 focus:outline-none py-2 text-sm md:text-base disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-full disabled:opacity-30 disabled:hover:from-amber-500 transition-all duration-200 shadow-lg flex items-center justify-center cursor-pointer"
              >
                <Send className="h-4.5 w-4.5 stroke-[2.5]" />
              </button>
            </form>

            <div className="text-center mt-3 text-[10px] text-slate-600">
              Conversations are saved securely on your local workspace cache. Powered by Google Gemini.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
