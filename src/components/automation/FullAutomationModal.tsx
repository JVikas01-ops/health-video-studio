import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clapperboard,
  Film,
  Camera,
  Volume2,
  X,
  Download,
} from 'lucide-react';
import type { Project, VisualStyle } from '../../types';
import type { AutomationMode, AutomationProgress } from '../../services/fullAutomationService';
import { FullAutomationService } from '../../services/fullAutomationService';
import { GeminiAutomationService } from '../../services/geminiAutomationService';
import type { StudioTab } from '../layout/Sidebar';

interface FullAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updated: Project) => Promise<void>;
  onNavigateTab: (tab: StudioTab) => void;
}

const PRESET_TOPICS = [
  { label: '💧 Water & Hydration Crisis', topic: 'How Water & Hydration Rescues Human Organs' },
  { label: '☕ Caffeine Rush & Heart Race', topic: 'The Great Caffeine Rush: Heart vs Brain' },
  { label: '🍕 Pizza Odyssey & Gastric Acid', topic: 'The Great Pizza Odyssey & Acid Reaction' },
  { label: '🛡️ Cellular Flu Defense', topic: 'Cellular Fortress: Immune Defense vs Virus' },
  { label: '🍬 Sugar Spike & Insulin Rescue', topic: 'Sugar Spike Chaos and Insulin Deployment' },
  { label: '🏃 Marathon Oxygen Depletion', topic: 'Marathon Run: Oxygen Crisis in Lungs & Muscles' },
];

export const FullAutomationModal: React.FC<FullAutomationModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onNavigateTab,
}) => {
  const [topic, setTopic] = useState(project.topic || 'How Water & Hydration Rescues Human Organs');
  const [mode, setMode] = useState<AutomationMode>('hybrid');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(project.settings.visualStyle || '3D Expressive Pixar Style');
  const [language, setLanguage] = useState<string>('English');
  const [synthesizeAudio, setSynthesizeAudio] = useState<boolean>(true);

  // Companion status
  const extensionId = localStorage.getItem('hvs_gemini_extension_id') || '';
  const [companionActive, setCompanionActive] = useState<boolean>(false);

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<AutomationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedProject, setCompletedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const check = async () => {
      if (!extensionId.trim()) {
        setCompanionActive(false);
        return;
      }
      const st = await GeminiAutomationService.pingCompanion(extensionId);
      setCompanionActive(Boolean(st.ok && st.connected));
    };
    void check();
  }, [isOpen, extensionId]);

  if (!isOpen) return null;

  const handleStartAutomation = async () => {
    setIsRunning(true);
    setError(null);
    setCompletedProject(null);
    setProgress({
      stageIndex: 0,
      totalStages: 5,
      stageName: 'Initializing Pipeline',
      percent: 5,
      message: 'Spinning up autonomous video production pipeline…',
    });

    try {
      const updated = await FullAutomationService.runFullAutomation(
        {
          topic,
          language,
          visualStyle,
          targetAudience: project.settings.targetAudience,
          mode,
          extensionId: extensionId.trim(),
          synthesizeAudio,
        },
        project,
        (p) => setProgress(p)
      );

      await onUpdateProject(updated);
      setCompletedProject(updated);
    } catch (err: any) {
      setError(err?.message || 'Automation failed. Check parameters and try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopAutomation = () => {
    FullAutomationService.stopAutomation();
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-cyan-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  STUDIO FULL AUTOMATION ENGINE
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  AUTO-PILOT v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click Autonomous Health Video Generation: Concept ➔ Script ➔ Images ➔ Motion Videos ➔ Voiceovers ➔ Final Master
              </p>
            </div>
          </div>

          {!isRunning && (
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* If NOT Running and NOT Completed, show Configuration Form */}
          {!isRunning && !completedProject && (
            <div className="space-y-6">
              {/* Topic Input & Quick Chips */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>1. Health & Biology Topic / Prompt</span>
                  <span className="text-[11px] text-slate-400 font-normal">Type custom idea or pick a preset</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. How Kidneys Filter Toxins and Balance Electrolytes"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_TOPICS.map((pt) => (
                    <button
                      key={pt.label}
                      type="button"
                      onClick={() => setTopic(pt.topic)}
                      className={`text-[11px] px-3 py-1 rounded-lg border transition ${
                        topic === pt.topic
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  2. Automation Engine Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => setMode('hybrid')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      mode === 'hybrid'
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" /> Auto-Pilot Hybrid
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Uses Gemini Web Companion for chat/images/video; automatically falls back to local procedural bio engine if rate-limited. 100% completion guaranteed.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setMode('local')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      mode === 'local'
                        ? 'bg-amber-950/40 border-amber-400 shadow-md shadow-amber-950/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5" /> Instant Local Engine
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          ~10 SECONDS
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        100% offline & instantaneous. Procedural 3D biological canvas frames, MediaRecorder camera motion WebM video, and speech synthesis voiceovers.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setMode('gemini')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      mode === 'gemini'
                        ? 'bg-purple-950/40 border-purple-400 shadow-md shadow-purple-950/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Gemini Web Studio
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                          {companionActive ? 'CONNECTED' : 'STANDBY'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Automates signed-in Gemini tab in Google Chrome. Zero API keys. Requires Chrome companion installed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Style & Voice Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Visual Art Style</label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="3D Expressive Pixar Style">3D Expressive Pixar Style</option>
                    <option value="Hyperrealistic Bio-Medical Animation">Hyperrealistic Bio-Medical Animation</option>
                    <option value="Vintage Sci-Fi Anatomical Comic">Vintage Sci-Fi Anatomical Comic</option>
                    <option value="Anime Cellular Cyberpunk">Anime Cellular Cyberpunk</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Character Audio Synthesis</label>
                  <div className="flex items-center h-9">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200 font-medium">
                      <input
                        type="checkbox"
                        checked={synthesizeAudio}
                        onChange={(e) => setSynthesizeAudio(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-4 h-4 bg-slate-950"
                      />
                      <span>Generate TTS Voiceovers</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Automation Execution View */}
          {(isRunning || completedProject) && progress && (
            <div className="space-y-5 animate-fadeIn">
              {/* Progress Bar & Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="font-bold text-white uppercase tracking-wider">
                      {progress.stageName} (Stage {progress.stageIndex} of {progress.totalStages})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {progress.percent}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 transition-all duration-300 rounded-full"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                <p className="text-xs text-slate-300 font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  {progress.message}
                </p>
              </div>

              {/* Stage Stepper Checklist */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { idx: 1, label: 'Concept & Organs', icon: Sparkles },
                  { idx: 2, label: '30-40s Script', icon: Clapperboard },
                  { idx: 3, label: 'Scene Artwork', icon: Camera },
                  { idx: 4, label: 'Motion Takes', icon: Film },
                  { idx: 5, label: 'Master Timeline', icon: Volume2 },
                ].map((st) => {
                  const isDone = progress.stageIndex > st.idx || (progress.stageIndex === 5 && progress.percent === 100);
                  const isCurrent = progress.stageIndex === st.idx && isRunning;
                  const Icon = st.icon;

                  return (
                    <div
                      key={st.idx}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : isCurrent
                          ? 'bg-amber-950/30 border-amber-400 text-amber-300 animate-pulse'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <div className="text-[10px] font-bold truncate">{st.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Live Preview Cards Grid */}
              {progress.scenesPreview && progress.scenesPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                    Generated Scene Pipeline ({progress.scenesPreview.length} Scenes)
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {progress.scenesPreview.map((sc) => (
                      <div
                        key={sc.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2 space-y-1.5 shadow-md"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                          {sc.videoUrl ? (
                            <video
                              src={sc.videoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : sc.imageUrl ? (
                            <img
                              src={sc.imageUrl}
                              alt={sc.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-[10px] text-slate-500 font-mono flex flex-col items-center gap-1">
                              <Camera className="w-4 h-4 animate-spin text-amber-400" />
                              <span>Rendering…</span>
                            </div>
                          )}

                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono font-bold text-amber-300">
                            Scene {sc.sceneNumber}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-200 truncate">{sc.title}</div>
                        <div className="text-[10px] text-slate-400 truncate">{sc.dialogues[0]?.speaker}: "{sc.dialogues[0]?.dialogueText}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Banner */}
              {completedProject && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/50 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Full Video Production Successfully Generated!</h4>
                      <p className="text-xs text-slate-300">
                        All scenes, transparent/cinematic artwork frames, motion video clips, character voiceovers, and master timeline approvals have been generated and saved.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('final_edit');
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Play Master Video in Final Edit Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('shots');
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      <Clapperboard className="w-3.5 h-3.5" />
                      <span>View Shot List</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('export');
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export All Files</span>
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            {isRunning ? 'Automation in progress…' : completedProject ? '100% Complete' : 'Zero API Keys Required • Runs in Browser'}
          </span>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={handleStopAutomation}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Stop Automation
              </button>
            ) : completedProject ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartAutomation}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 hover:opacity-95 text-slate-950 text-xs font-extrabold tracking-wide transition shadow-lg shadow-amber-500/25"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>START FULL AUTOMATION</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
