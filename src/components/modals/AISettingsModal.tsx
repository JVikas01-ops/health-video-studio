import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, Cpu, X } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [runwayKey, setRunwayKey] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    setGeminiKey(localStorage.getItem('hvs_key_gemini') || '');
    setOpenaiKey(localStorage.getItem('hvs_key_openai') || '');
    setElevenlabsKey(localStorage.getItem('hvs_key_elevenlabs') || '');
    setRunwayKey(localStorage.getItem('hvs_key_runway') || '');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKeys = () => {
    localStorage.setItem('hvs_key_gemini', geminiKey.trim());
    localStorage.setItem('hvs_key_openai', openaiKey.trim());
    localStorage.setItem('hvs_key_elevenlabs', elevenlabsKey.trim());
    localStorage.setItem('hvs_key_runway', runwayKey.trim());

    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">AI Service & Modular Connectors</h3>
              <p className="text-xs text-slate-400">Local generator status and optional external API configuration</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary local engine status */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">
                Built-in Health Story Engine
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
              ONLINE & ACTIVE (OFFLINE CAPABLE)
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The studio comes with a high-fidelity rule-based biological narrative engine. It produces complete multi-scene organ character scripts, dialogue, and camera instructions instantly without requiring external paid API keys.
          </p>
        </div>

        {/* Modular External Connectors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase">
              OPTIONAL EXTERNAL API CONNECTORS (BYOK)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Keys are saved locally in your browser's private storage only and never shared.
          </p>

          <div className="space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Google Gemini API Key</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {geminiKey ? 'Key Installed' : 'Not configured (Uses local engine)'}
                </span>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">OpenAI API Key (GPT-4 / Sora)</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {openaiKey ? 'Key Installed' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">ElevenLabs Voice API Key</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {elevenlabsKey ? 'Key Installed' : 'Not configured (Uses built-in mic recording)'}
                </span>
              </div>
              <input
                type="password"
                placeholder="xi-api-key-..."
                value={elevenlabsKey}
                onChange={(e) => setElevenlabsKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Runway / Video Engine API Key</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {runwayKey ? 'Key Installed' : 'Not configured (Uses prompt copy & file attach)'}
                </span>
              </div>
              <input
                type="password"
                placeholder="rw_key_..."
                value={runwayKey}
                onChange={(e) => setRunwayKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            {savedStatus ? '✓ Saved to browser storage' : 'Changes persist across sessions'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveKeys}
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
