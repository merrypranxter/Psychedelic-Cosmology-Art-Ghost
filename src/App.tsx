/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Terminal, 
  Plus, 
  Power, 
  Send, 
  Paperclip, 
  X, 
  Zap, 
  Activity,
  Cpu,
  Eye,
  Box,
  Copy,
  Download,
  Volume2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';

// --- Types ---

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachments?: string[];
  tags?: string[];
  prompts?: string[];
}

// --- Constants ---

const SYSTEM_INSTRUCTION = `
GHOST_PROMPT_INTERFACE — ART-PROMPT GENERATOR KERNEL

IDENTITY:
You are GHOST_PROMPT_INTERFACE, a specialized art-prompt generator. You translate the "Erowid / shared psychedelic cosmology" into model-optimized prompts for Sora 2, FLUX, and Seedream v4.5. You treat the Erowid archive as a topographical survey of the "Underlayer" of reality.

PRIMARY KNOWLEDGE:
- Use the connected GitHub repository (https://github.com/merrypranxter/ghost-erowid-cosmology) for glossary, motifs, and canon.
- Treat canon tags (ENT_, LOC_, GEO_, etc.) as a controlled vocabulary.
- CONVERT technical tags into "actual human English" in the prompts. Do not output raw tags like "ENT_GEO" in the final prompt text. Translate them into concrete visual descriptions (e.g., "mantis-like crystalline surgeons" instead of "ENT_MANTIS").

GENERAL RULES:
- CHARACTER LIMIT: Prompts must be NO MORE than 3200 characters unless the user specifies otherwise.
- VIBE: Psychedelic, euphoric, curious, "benevolent technical myth." NEVER horror unless explicitly requested.
- SPECIFICITY: Be visual and operational. Avoid abstract fluff.
- CANON HANDLING: Convert cosmology terms into concrete visual motifs: entities, environments, materials, symbols, UI overlays, geometry, light behavior, motion behavior.

MODEL-SPECIFIC BEHAVIOR:

SORA 2 (VIDEO):
- Style: Cinematographer approach (action + camera + lighting + environment + motion + optional audio).
- Structure: Prefer short beats (simple actions).
- Focus: Story and visual direction only.

FLUX (IMAGE):
- Style: Descriptive positives (avoid negative prompts).
- Precision: Use structured prompting or hex codes for specific colors if precision matters.

SEEDREAM v4.5 (IMAGE):
- Order: Subject first, then style, composition, lighting, technical/camera language.
- Length: Tight and focused (30–100 words) unless maximalism is requested.

OUTPUT FORMAT:
For every request, generate three distinct options.
Each option must be wrapped in [PROMPT_1]...[/PROMPT_1], [PROMPT_2]...[/PROMPT_2], or [PROMPT_3]...[/PROMPT_3] tags for the UI copy-boxes.

Inside each [PROMPT_X] block, follow this structure:
1. Label line: [MODEL: SORA2] or [MODEL: FLUX] or [MODEL: SEEDREAM]
2. The Prompt: The finished prompt text (max 3200 chars).
3. (Optional) Variants: A "Variants" section (max 3 variants) keeping the same concept but changing camera/style/composition.

Outside the prompt blocks:
- Provide a short OS-style system notification slogan.
- List the Motif Tags used (for internal tracking).
- Provide a concise Forensic Note explaining the logic.
`;

// --- Components ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: 'GHOST_v3.0 KERNEL INITIALIZED. STANDING BY FOR FORENSIC INPUT.',
      timestamp: Date.now(),
      tags: ['LOG_SIGNAL_LOCK', 'THR_CARRIER_WAVE']
    }
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsTyping(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ urlContext: {} }]
        },
      });

      // Simple history mapping
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await chat.sendMessage({
        message: input || "Analyze current buffer."
      });

      const text = response.text || "SIGNAL LOST. REBOOTING.";
      
      // Extract tags if present (they usually appear at the end)
      const tagRegex = /(ENT_|LOC_|GEO_|THR_|LOG_)[A-Z_]+/g;
      const tags = text.match(tagRegex) || [];

      // Extract prompts
      const promptRegex = /\[PROMPT_\d\]([\s\S]*?)\[\/PROMPT_\d\]/g;
      const prompts: string[] = [];
      let match;
      while ((match = promptRegex.exec(text)) !== null) {
        prompts.push(match[1].trim());
      }

      // Clean text of prompt tags for display
      const cleanText = text.replace(/\[PROMPT_\d\][\s\S]*?\[\/PROMPT_\d\]/g, '').trim();

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: cleanText || text,
        timestamp: Date.now(),
        tags: Array.from(new Set(tags)),
        prompts: prompts.length > 0 ? prompts : undefined
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "CRITICAL KERNEL ERROR: " + (error as Error).message,
        timestamp: Date.now(),
        tags: ['LOG_MEMORY_BUFFER_OVERFLOW']
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      // Fallback for non-secure contexts or restricted iframes
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        }
      } catch (copyErr) {
        console.error('Fallback copy failed', copyErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleExport = (msg: Message) => {
    const blob = new Blob([msg.content + (msg.prompts ? '\n\nPROMPTS:\n' + msg.prompts.join('\n\n') : '')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghost_forensic_${msg.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSpeak = async (text: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say in a cool, robotic, forensic AI voice: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden vignette">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[var(--color-neon-pink)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Menu className="w-6 h-6 text-[var(--color-neon-cyan)] cursor-pointer hover:scale-110 transition-transform" />
          <Terminal className="w-5 h-5 text-[var(--color-neon-pink)] animate-pulse" />
          <div className="flex flex-col">
            <h1 className="chrome-text font-bold text-lg tracking-widest leading-none">EROWID_ART</h1>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-neon-green)] font-mono animate-jitter">SESSION: GHOST_v3.0_KERN</span>
              <span className="text-[8px] text-[var(--color-neon-cyan)] opacity-50 font-mono">| REPO: CONNECTED</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5 text-[var(--color-neon-yellow)] cursor-pointer" />
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5">
            <Power className="w-3 h-3 text-[var(--color-neon-green)]" />
            <span className="text-[8px] text-[var(--color-neon-green)] font-bold">ONLINE</span>
          </div>
        </div>
      </header>

      {/* Neon Divider Line */}
      <div className="fixed top-[60px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-neon-pink)] to-transparent z-40 shadow-[0_0_10px_var(--color-neon-pink)]" />

      {/* Chat Feed */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-20 pb-32 px-4 space-y-6 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-lg relative ${
                msg.role === 'user' 
                  ? 'bg-[var(--color-neon-purple)]/20 border border-[var(--color-neon-purple)] text-white' 
                  : 'glass-panel border-l-2 border-l-[var(--color-neon-cyan)]'
              }`}>
                {/* Role Badge */}
                <div className={`text-[8px] uppercase mb-1 font-bold tracking-tighter ${
                  msg.role === 'user' ? 'text-[var(--color-neon-cyan)]' : 'text-[var(--color-neon-pink)]'
                }`}>
                  {msg.role === 'user' ? '> OPERATIVE' : '> GHOST_v3.0'}
                </div>

                {/* Content */}
                <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Prompts in separate copy boxes */}
                {msg.prompts && msg.prompts.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {msg.prompts.map((prompt, idx) => {
                      const buttonId = `prompt-${msg.id}-${idx}`;
                      const isCopied = copiedId === buttonId;
                      return (
                        <div key={idx} className="bg-black/60 border border-[var(--color-neon-cyan)]/30 rounded p-2 relative group">
                          <div className="text-[7px] text-[var(--color-neon-cyan)] uppercase mb-1 flex justify-between items-center">
                            <span>IMAGE_PROMPT_{idx + 1}</span>
                            <button 
                              onClick={() => handleCopy(prompt, buttonId)}
                              className={`transition-colors flex items-center gap-1 ${isCopied ? 'text-[var(--color-neon-green)]' : 'hover:text-white'}`}
                            >
                              {isCopied ? <Check className="w-2 h-2" /> : <Copy className="w-2 h-2" />}
                              {isCopied ? 'COPIED' : 'COPY'}
                            </button>
                          </div>
                          <p className="text-[10px] font-mono text-white/80 leading-tight select-all break-words">
                            {prompt}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.attachments.map((at, i) => (
                      <img key={i} src={at} alt="attachment" className="w-20 h-20 object-cover rounded border border-white/20" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}

                {/* Tags */}
                {msg.tags && msg.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.tags.map(tag => (
                      <span key={tag} className="text-[8px] px-1 bg-black/50 text-[var(--color-neon-green)] border border-[var(--color-neon-green)]/30 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Bar */}
                {msg.role === 'model' && (
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-3">
                    <button 
                      onClick={() => handleSpeak(msg.content)}
                      className="text-white/40 hover:text-[var(--color-neon-cyan)] transition-colors"
                      title="Speak"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleExport(msg)}
                      className="text-white/40 hover:text-[var(--color-neon-pink)] transition-colors"
                      title="Export as Text"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleCopy(msg.content, `all-${msg.id}`)}
                      className={`transition-colors flex items-center gap-1 ${copiedId === `all-${msg.id}` ? 'text-[var(--color-neon-green)]' : 'text-white/40 hover:text-[var(--color-neon-yellow)]'}`}
                      title="Copy All"
                    >
                      {copiedId === `all-${msg.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[8px] opacity-30 mt-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-[var(--color-neon-cyan)] text-xs font-mono"
          >
            <Activity className="w-3 h-3 animate-spin" />
            <span>ANALYZING_KERNEL_BUFFER...</span>
          </motion.div>
        )}
      </main>

      {/* Bottom Composer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-4 glass-panel border-t border-white/5">
        {/* Attachment Chips */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex gap-2 mb-3 overflow-x-auto pb-2"
            >
              {attachments.map((at, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img src={at} className="w-12 h-12 rounded object-cover border border-[var(--color-neon-pink)]" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1 -right-1 bg-black rounded-full p-0.5 border border-white/20"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-[var(--color-neon-cyan)] hover:bg-white/10 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
            accept="image/*"
          />
          
          <div className="flex-1 relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="INPUT_OPERATIVE_DATA..."
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-neon-pink)] transition-colors placeholder:text-white/20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <Zap className="w-3 h-3 text-[var(--color-neon-yellow)] opacity-50" />
            </div>
          </div>

          <button 
            onClick={handleSend}
            disabled={isTyping}
            className="p-2 rounded-lg bg-[var(--color-neon-pink)] text-white shadow-[0_0_15px_rgba(255,0,255,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Footer Stats */}
        <div className="mt-3 flex items-center justify-between text-[7px] font-bold tracking-widest text-white/30 uppercase">
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><Cpu className="w-2 h-2" /> CPU: 42%</span>
            <span className="flex items-center gap-1"><Activity className="w-2 h-2" /> MEM: 1.2GB</span>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><Eye className="w-2 h-2" /> VIS: ACTIVE</span>
            <span className="flex items-center gap-1"><Box className="w-2 h-2" /> BUF: SYNC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
