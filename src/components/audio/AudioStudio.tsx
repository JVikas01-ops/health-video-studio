import React, { useState, useRef } from 'react';
import {
  Mic,
  Music,
  Volume2,
  Play,
  Square,
  Upload,
  Plus,
  Trash2,
  Radio,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Project, Shot, ShotSoundEffect, ApprovalStatus } from '../../types';
import { PromptCopyButton, ApprovalBadge } from '../common/StatusBadge';

interface AudioStudioProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const AudioStudio: React.FC<AudioStudioProps> = ({ project, onUpdateProject }) => {
  const [selectedShotId, setSelectedShotId] = useState<string>(
    project.scenes[0]?.shots[0]?.id || ''
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<{
    type: 'dialogue' | 'sfx';
    id: string;
  } | null>(null);
  const [currentlyPlayingUrl, setCurrentlyPlayingUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<{
    type: 'dialogue' | 'sfx' | 'bgm';
    id: string;
  } | null>(null);

  // Find active shot
  let activeShot: Shot | null = null;
  let activeSceneNumber = 1;
  for (const scene of project.scenes) {
    for (const shot of scene.shots) {
      if (shot.id === selectedShotId) {
        activeShot = shot;
        activeSceneNumber = scene.sceneNumber;
        break;
      }
    }
    if (activeShot) break;
  }

  // Play / Pause audio preview
  const handlePlayAudio = (url: string) => {
    if (currentlyPlayingUrl === url) {
      audioPlayerRef.current?.pause();
      setCurrentlyPlayingUrl(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        setCurrentlyPlayingUrl(url);
      }
    }
  };

  // Browser Microphone Recording
  const startRecording = async (type: 'dialogue' | 'sfx', id: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          saveAudioToTarget(type, id, base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTarget({ type, id });
    } catch (err) {
      console.error(err);
      alert('Microphone access denied or not available. You can upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTarget(null);
    }
  };

  // Save base64 audio to state
  const saveAudioToTarget = (type: 'dialogue' | 'sfx' | 'bgm', id: string, audioUrl: string) => {
    if (!activeShot) return;

    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => {
        if (shot.id !== activeShot?.id) return shot;

        if (type === 'dialogue') {
          return {
            ...shot,
            dialogues: shot.dialogues.map((d) =>
              d.id === id ? { ...d, audioUrl, approvalStatus: 'awaiting_approval' as ApprovalStatus } : d
            ),
          };
        } else if (type === 'sfx') {
          return {
            ...shot,
            soundEffects: shot.soundEffects.map((s) =>
              s.id === id ? { ...s, audioUrl, approvalStatus: 'awaiting_approval' as ApprovalStatus } : s
            ),
          };
        } else if (type === 'bgm') {
          return {
            ...shot,
            backgroundMusicTrack: audioUrl,
            backgroundMusicApprovalStatus: 'awaiting_approval' as ApprovalStatus,
          };
        }
        return shot;
      }),
    }));

    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Set audio approval state
  const handleSetAudioApproval = (
    type: 'dialogue' | 'sfx' | 'bgm',
    id: string,
    status: ApprovalStatus
  ) => {
    if (!activeShot) return;

    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => {
        if (shot.id !== activeShot?.id) return shot;

        if (type === 'dialogue') {
          return {
            ...shot,
            dialogues: shot.dialogues.map((d) =>
              d.id === id ? { ...d, approvalStatus: status } : d
            ),
          };
        } else if (type === 'sfx') {
          return {
            ...shot,
            soundEffects: shot.soundEffects.map((s) =>
              s.id === id ? { ...s, approvalStatus: status } : s
            ),
          };
        } else if (type === 'bgm') {
          return {
            ...shot,
            backgroundMusicApprovalStatus: status,
          };
        }
        return shot;
      }),
    }));

    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Upload local audio file
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      saveAudioToTarget(uploadTargetId.type, uploadTargetId.id, base64);
      setUploadTargetId(null);
    };
    reader.readAsDataURL(file);
  };

  // Add SFX to shot
  const handleAddSFX = () => {
    if (!activeShot) return;
    const newSFX: ShotSoundEffect = {
      id: `sfx-${activeShot.id}-${Date.now()}`,
      name: 'New Sound Effect',
      prompt: 'Sound design prompt for audio synthesis...',
    };

    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) =>
        shot.id === activeShot?.id
          ? { ...shot, soundEffects: [...shot.soundEffects, newSFX] }
          : shot
      ),
    }));

    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Delete SFX
  const handleDeleteSFX = (sfxId: string) => {
    if (!activeShot) return;
    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) =>
        shot.id === activeShot?.id
          ? { ...shot, soundEffects: shot.soundEffects.filter((s) => s.id !== sfxId) }
          : shot
      ),
    }));
    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Hidden audio element for preview */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setCurrentlyPlayingUrl(null)}
        className="hidden"
      />

      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-cyan-400 font-semibold tracking-wider">
              CORE FEATURE 5
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Dialogue Audio, Voice Recording & Sound FX Architecture
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Audio Studio</h1>
        </div>

        {/* Global recording status pill */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold animate-pulse">
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span>RECORDING IN PROGRESS...</span>
            <button
              onClick={stopRecording}
              type="button"
              className="ml-2 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] uppercase font-bold"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Shot Selector for Audio */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              SELECT SHOT AUDIO
            </span>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {project.scenes.map((scene) => (
              <div key={scene.id} className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase px-1">
                  Scene {scene.sceneNumber}: {scene.title}
                </span>

                {scene.shots.map((shot) => {
                  const isSelected = selectedShotId === shot.id;
                  const hasDialogueAudio = shot.dialogues.some((d) => Boolean(d.audioUrl));
                  const hasSFXAudio = shot.soundEffects.some((s) => Boolean(s.audioUrl));

                  return (
                    <button
                      key={shot.id}
                      onClick={() => setSelectedShotId(shot.id)}
                      type="button"
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {shot.shotCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {shot.durationSec}s
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {shot.dialogues[0]?.line || 'No dialogue'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasDialogueAudio && (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-400"
                            title="Dialogue Audio Attached"
                          />
                        )}
                        {hasSFXAudio && (
                          <span
                            className="w-2 h-2 rounded-full bg-cyan-400"
                            title="SFX Attached"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Shot Audio Console */}
        {activeShot && (
          <div className="lg:col-span-3 space-y-6">
            {/* Top Shot Audio Header */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30">
                    {activeShot.shotCode}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">
                      Audio Console: Scene {activeSceneNumber}
                    </h3>
                    <p className="text-xs text-slate-400">{activeShot.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Shot Runtime: {activeShot.durationSec}s</span>
                </div>
              </div>

              {/* Section 1: Dialogue Audio Tracks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span>Dialogue Tracks ({activeShot.dialogues.length})</span>
                  </span>
                </div>

                {activeShot.dialogues.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No dialogue lines assigned to this shot.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeShot.dialogues.map((dlg) => {
                      const char = project.characters.find((c) => c.id === dlg.characterId);
                      const isThisRecording =
                        isRecording &&
                        recordingTarget?.type === 'dialogue' &&
                        recordingTarget.id === dlg.id;

                      return (
                        <div
                          key={dlg.id}
                          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: char?.colorBadge || '#f59e0b' }}
                              />
                              <span className="text-xs font-bold text-slate-200">
                                {dlg.characterName}
                              </span>
                              {dlg.audioPrompt && (
                                <span className="text-[10px] text-slate-400 font-mono italic">
                                  ({dlg.audioPrompt})
                                </span>
                              )}
                            </div>

                            {/* Voice Status & Generator Prompt Copy */}
                            <div className="flex items-center gap-2">
                              {dlg.approvalStatus && <ApprovalBadge status={dlg.approvalStatus} />}
                              <PromptCopyButton
                                text={`Voice prompt: ${
                                  char?.voiceProfile.description || 'Clear voice'
                                }. Dialogue: "${dlg.line}"`}
                                label="Voice Prompt"
                              />
                            </div>
                          </div>

                          {/* Dialogue Text */}
                          <p className="text-xs text-slate-300 font-sans italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                            "{dlg.line}"
                          </p>

                          {/* Audio Player / Approval & Record Controls */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {dlg.audioUrl ? (
                                <>
                                  <button
                                    onClick={() => handlePlayAudio(dlg.audioUrl!)}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
                                  >
                                    {currentlyPlayingUrl === dlg.audioUrl ? (
                                      <>
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                        <span>Stop Audio</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>Play Dialogue</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Human Approval Controls for this Voice Take */}
                                  {dlg.approvalStatus !== 'approved' && (
                                    <button
                                      onClick={() => handleSetAudioApproval('dialogue', dlg.id, 'approved')}
                                      type="button"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve Voice</span>
                                    </button>
                                  )}

                                  {dlg.approvalStatus !== 'rejected' && (
                                    <button
                                      onClick={() => handleSetAudioApproval('dialogue', dlg.id, 'rejected')}
                                      type="button"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono">
                                  No audio file attached
                                </span>
                              )}
                            </div>

                            {/* Record / Upload buttons */}
                            <div className="flex items-center gap-2">
                              {isThisRecording ? (
                                <button
                                  onClick={stopRecording}
                                  type="button"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white animate-pulse"
                                >
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                  <span>Stop & Save Voice</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => startRecording('dialogue', dlg.id)}
                                  type="button"
                                  disabled={isRecording}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                                >
                                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                                  <span>{dlg.audioUrl ? 'Re-record' : 'Record Mic'}</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setUploadTargetId({ type: 'dialogue', id: dlg.id });
                                  fileInputRef.current?.click();
                                }}
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                              >
                                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{dlg.audioUrl ? 'Replace File' : 'Upload Audio'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: Sound Effects (SFX) */}
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>Sound Effects ({activeShot.soundEffects.length})</span>
                  </span>

                  <button
                    onClick={handleAddSFX}
                    type="button"
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Sound Effect</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeShot.soundEffects.map((sfx) => (
                    <div
                      key={sfx.id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{sfx.name}</span>
                          {sfx.approvalStatus ? (
                            <ApprovalBadge status={sfx.approvalStatus} />
                          ) : sfx.audioUrl ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono">
                              Loaded
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{sfx.prompt}</p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {sfx.prompt && <PromptCopyButton text={sfx.prompt} label="Copy SFX Prompt" />}

                        {sfx.audioUrl && (
                          <>
                            <button
                              onClick={() => handlePlayAudio(sfx.audioUrl!)}
                              type="button"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                              title="Play SFX"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>

                            {sfx.approvalStatus !== 'approved' && (
                              <button
                                onClick={() => handleSetAudioApproval('sfx', sfx.id, 'approved')}
                                type="button"
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                title="Approve SFX for Final Edit"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {sfx.approvalStatus !== 'rejected' && (
                              <button
                                onClick={() => handleSetAudioApproval('sfx', sfx.id, 'rejected')}
                                type="button"
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300"
                                title="Reject SFX"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => {
                            setUploadTargetId({ type: 'sfx', id: sfx.id });
                            fileInputRef.current?.click();
                          }}
                          type="button"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          title="Upload SFX file"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteSFX(sfx.id)}
                          type="button"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400"
                          title="Delete SFX"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Background Music Track */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  <span>Background Music Motif</span>
                </span>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block font-mono text-[11px]">
                      ASSOCIATED SCORE:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {activeShot.backgroundMusicTrack || 'Standard Orchestral Pulse'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeShot.backgroundMusicApprovalStatus && (
                      <ApprovalBadge status={activeShot.backgroundMusicApprovalStatus} />
                    )}

                    {activeShot.backgroundMusicApprovalStatus !== 'approved' && (
                      <button
                        onClick={() => handleSetAudioApproval('bgm', activeShot.id, 'approved')}
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve BGM</span>
                      </button>
                    )}

                    {activeShot.backgroundMusicTrack && (
                      <PromptCopyButton
                        text={activeShot.backgroundMusicTrack}
                        label="Copy BGM Description"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
