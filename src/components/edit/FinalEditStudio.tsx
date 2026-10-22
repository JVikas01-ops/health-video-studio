import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  ShieldCheck,
  History,
  Info,
  Download,
} from 'lucide-react';
import type { Project, Shot, ApprovalStatus, ApprovalHistoryItem } from '../../types';
import { ApprovalBadge } from '../common/StatusBadge';
import { canProceedToFinalEdit, createApprovalRecord } from '../../services/stageGating';
import type { StudioTab } from '../layout/Sidebar';

interface FinalEditStudioProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const FinalEditStudio: React.FC<FinalEditStudioProps> = ({
  project,
  onUpdateProject,
  onNavigateTab,
}) => {
  // Flatten all shots across scenes
  const allShots: Shot[] = [];
  for (const scene of project.scenes) {
    for (const shot of scene.shots) {
      allShots.push(shot);
    }
  }

  // Initial sequence order from project.finalEditApproval or default all shots
  const [arrangedShotIds, setArrangedShotIds] = useState<string[]>(() => {
    if (project.finalEditApproval?.arrangedShotIds && project.finalEditApproval.arrangedShotIds.length > 0) {
      // Ensure all current shot IDs exist in arranged list
      const existingIds = new Set(allShots.map((s) => s.id));
      const validArranged = project.finalEditApproval.arrangedShotIds.filter((id) => existingIds.has(id));
      const missing = allShots.filter((s) => !validArranged.includes(s.id)).map((s) => s.id);
      return [...validArranged, ...missing];
    }
    return allShots.map((s) => s.id);
  });

  // Custom durations per shot in timeline (shotId -> seconds)
  const [timelineDurations, setTimelineDurations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const shot of allShots) {
      initial[shot.id] = project.finalEditApproval?.timelineDurations?.[shot.id] ?? shot.durationSec ?? 4;
    }
    return initial;
  });

  // Player State
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTimeInCurrentShot, setPlaybackTimeInCurrentShot] = useState(0);

  // Modals
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [signOffAction, setSignOffAction] = useState<'accept' | 'revise'>('accept');
  const [reviewerName, setReviewerName] = useState('Director');
  const [reviewNotes, setReviewNotes] = useState('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // HTML5 Player Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<number | null>(null);

  // Pre-flight validation
  const finalEditGate = canProceedToFinalEdit(project);
  const approvalStatus: ApprovalStatus = project.finalEditApproval?.status || 'draft';

  // Ordered shots
  const sequenceShots: Shot[] = arrangedShotIds
    .map((id) => allShots.find((s) => s.id === id))
    .filter((s): s is Shot => Boolean(s));

  // Total runtime
  const totalDurationSec = sequenceShots.reduce(
    (acc, sh) => acc + (timelineDurations[sh.id] || sh.durationSec || 4),
    0
  );

  const activeShot = sequenceShots[currentPlayIndex] || sequenceShots[0] || null;

  // Find video take URL for current active shot
  const activeVideoTake = activeShot?.videoCandidates?.find(
    (c) => c.id === activeShot.approvedVideoId || c.isApprovedTake
  );
  const activeVideoUrl = activeVideoTake?.videoUrl || activeShot?.attachedVideoUrl;
  const activeImageUrl =
    activeShot?.imageCandidates?.find((c) => c.id === activeShot.approvedImageId)?.imageUrl ||
    activeShot?.attachedImageUrl;

  // Active dialogue audio
  const activeDialogue = activeShot?.dialogues?.find((d) => Boolean(d.audioUrl));
  const activeAudioUrl = activeDialogue?.audioUrl;

  // Sequential Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    if (!activeShot) {
      setIsPlaying(false);
      return;
    }

    // Start video and audio
    if (videoRef.current && activeVideoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current && activeAudioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    const currentShotDuration = timelineDurations[activeShot.id] || activeShot.durationSec || 4;

    const interval = window.setInterval(() => {
      setPlaybackTimeInCurrentShot((prev) => {
        const nextTime = prev + 0.25;
        if (nextTime >= currentShotDuration) {
          // Advance to next shot in sequence
          if (currentPlayIndex < sequenceShots.length - 1) {
            setCurrentPlayIndex((idx) => idx + 1);
            return 0;
          } else {
            // Reached end of sequence
            setIsPlaying(false);
            return 0;
          }
        }
        return nextTime;
      });
    }, 250);

    playTimerRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, currentPlayIndex, sequenceShots.length, activeVideoUrl, activeAudioUrl]);

  // Reorder shots in timeline
  const handleMoveShotInTimeline = (index: number, direction: 'earlier' | 'later') => {
    if (direction === 'earlier' && index === 0) return;
    if (direction === 'later' && index === sequenceShots.length - 1) return;

    const targetIndex = direction === 'earlier' ? index - 1 : index + 1;
    const newArranged = [...arrangedShotIds];
    const [movedId] = newArranged.splice(index, 1);
    newArranged.splice(targetIndex, 0, movedId);

    setArrangedShotIds(newArranged);
    saveTimelineChanges(newArranged, timelineDurations);
  };

  // Adjust timing
  const handleDurationChange = (shotId: string, duration: number) => {
    const updated = {
      ...timelineDurations,
      [shotId]: Math.max(1, Math.min(60, duration)),
    };
    setTimelineDurations(updated);
    saveTimelineChanges(arrangedShotIds, updated);
  };

  // Save order and timing persistently
  const saveTimelineChanges = (
    arranged: string[],
    durations: Record<string, number>,
    newStatus?: ApprovalStatus,
    newHistory?: ApprovalHistoryItem
  ) => {
    const currentApproval = project.finalEditApproval || {
      status: 'draft' as ApprovalStatus,
      history: [],
      arrangedShotIds: arranged,
      timelineDurations: durations,
    };

    const updatedApproval = {
      ...currentApproval,
      arrangedShotIds: arranged,
      timelineDurations: durations,
      status: newStatus || currentApproval.status,
      history: newHistory ? [...currentApproval.history, newHistory] : currentApproval.history,
      lastReviewedAt: newStatus ? new Date().toISOString() : currentApproval.lastReviewedAt,
    };

    onUpdateProject({
      ...project,
      finalEditApproval: updatedApproval,
    });
  };

  // Human Sign-off confirmation
  const handleConfirmSignOff = () => {
    const isApprove = signOffAction === 'accept';
    const newStatus: ApprovalStatus = isApprove ? 'approved' : 'needs_revision';
    const noteText = reviewNotes.trim() || (isApprove ? 'Final master cut approved for export' : 'Re-cut requested');

    const historyRecord = createApprovalRecord(
      newStatus,
      `[${reviewerName.trim() || 'Director'}] ${noteText}`,
      approvalStatus,
      'human_reviewer'
    );

    saveTimelineChanges(arrangedShotIds, timelineDurations, newStatus, historyRecord);
    setSignOffModalOpen(false);
    setReviewNotes('');
  };

  // Formatter for time MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Hidden Audio Player for Dialogue Voiceover Sync */}
      {activeAudioUrl && <audio ref={audioRef} src={activeAudioUrl} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-purple-400 font-semibold tracking-wider">
              STAGE 6 TIMELINE
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Non-Destructive Sequential Edit & Final Human Approval
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-purple-400" />
            <span>Final Edit Timeline Studio</span>
          </h1>
        </div>

        {/* Approval Status Badge & Sign-off Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400 font-mono">Status:</span>
            <ApprovalBadge status={approvalStatus} />
          </div>

          <button
            onClick={() => setHistoryModalOpen(true)}
            type="button"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
            title="View Approval Audit History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Sign-off Trigger Buttons */}
          <button
            onClick={() => {
              setSignOffAction('revise');
              setSignOffModalOpen(true);
            }}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Request Re-Cut</span>
          </button>

          <button
            onClick={() => {
              setSignOffAction('accept');
              setSignOffModalOpen(true);
            }}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-lg transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Approve Master Cut</span>
          </button>
        </div>
      </div>

      {/* Pre-Flight Readiness Summary Banner */}
      {!finalEditGate.eligible ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Pre-flight Notice:</strong> {finalEditGate.reason}
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('video')}
              type="button"
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold shrink-0"
            >
              Go to Video Manager →
            </button>
          )}
        </div>
      ) : approvalStatus === 'approved' ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Master Edit Approved!</strong> This project has passed all human creative approval gates and is cleared for distribution packaging.
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('export')}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1.5 shrink-0 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Proceed to Export & Files →</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Master Sequential Preview Player */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-purple-400 uppercase">
              MASTER PREVIEW MONITOR
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300">
              Shot {currentPlayIndex + 1} of {sequenceShots.length}: {activeShot?.shotCode}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Timeline: {formatTime(playbackTimeInCurrentShot)} / {formatTime(totalDurationSec)}
            </span>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
          {activeVideoUrl ? (
            <video
              ref={videoRef}
              src={activeVideoUrl}
              className="w-full h-full object-contain"
              playsInline
            />
          ) : activeImageUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={activeImageUrl}
                alt="Approved reference frame"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded bg-black/75 backdrop-blur text-[11px] font-mono text-amber-300 border border-amber-500/30">
                Static Reference (Video take pending)
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-xs text-slate-500">
              No approved media for active shot
            </div>
          )}

          {/* Subtitle / Dialogue Overlay Banner */}
          {activeDialogue && (
            <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
              <div className="inline-block px-4 py-2 rounded-xl bg-black/85 backdrop-blur border border-slate-700/60 max-w-2xl text-xs text-slate-100 font-sans shadow-lg">
                <span className="font-bold text-amber-300 mr-2">{activeDialogue.characterName}:</span>
                <span>"{activeDialogue.line}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Transport Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Play / Pause / Skip */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentPlayIndex > 0) {
                  setCurrentPlayIndex(currentPlayIndex - 1);
                  setPlaybackTimeInCurrentShot(0);
                }
              }}
              disabled={currentPlayIndex === 0}
              type="button"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
              title="Previous Shot"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              type="button"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 shadow transition"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Cut</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Entire Cut</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (currentPlayIndex < sequenceShots.length - 1) {
                  setCurrentPlayIndex(currentPlayIndex + 1);
                  setPlaybackTimeInCurrentShot(0);
                }
              }}
              disabled={currentPlayIndex >= sequenceShots.length - 1}
              type="button"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
              title="Next Shot"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentPlayIndex(0);
                setPlaybackTimeInCurrentShot(0);
                setIsPlaying(false);
              }}
              type="button"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              title="Restart Sequence from Beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Non-destructive guarantee notice */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Non-destructive client playback. Discrete shot files remain intact.</span>
          </div>
        </div>
      </div>

      {/* Timeline Arrangement & Timing Bay */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-200 uppercase">
              TIMELINE REEL & PACING ({sequenceShots.length} SHOTS)
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-purple-300 font-mono">
              Total Duration: {formatTime(totalDurationSec)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Use arrows to reorder shots in the final cut; adjust duration sliders to fine-tune pacing.
          </span>
        </div>

        {/* Timeline Sequence Strip */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {sequenceShots.map((shot, idx) => {
            const isCurrent = idx === currentPlayIndex;
            const duration = timelineDurations[shot.id] || shot.durationSec || 4;
            const hasApprovedTake = Boolean(
              shot.approvedVideoId || shot.videoCandidates?.some((c) => c.isApprovedTake)
            );
            const approvedFrame =
              shot.imageCandidates?.find((c) => c.id === shot.approvedImageId)?.imageUrl ||
              shot.attachedImageUrl;

            return (
              <div
                key={shot.id}
                className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCurrent
                    ? 'bg-purple-950/20 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Left: Thumbnail & Shot ID */}
                <div className="flex items-center gap-3 min-w-[260px]">
                  <div className="w-20 h-12 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {approvedFrame ? (
                      <img src={approvedFrame} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-200">
                        {idx + 1}. {shot.shotCode}
                      </span>
                      {hasApprovedTake ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                          ✓ Take Approved
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold border border-amber-500/30">
                          Pending Take
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                      {shot.description}
                    </p>
                  </div>
                </div>

                {/* Middle: Dialogue & Audio Details */}
                <div className="min-w-0 flex-1 px-2">
                  {shot.dialogues && shot.dialogues.length > 0 ? (
                    <div className="text-xs text-slate-300 italic truncate">
                      <span className="font-semibold text-amber-400 mr-1">
                        {shot.dialogues[0].characterName}:
                      </span>
                      "{shot.dialogues[0].line}"
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No dialogue</span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    {shot.shotType} • {shot.cameraInstruction}
                  </span>
                </div>

                {/* Right: Timing Adjuster & Reordering Controls */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Duration Control */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400">Duration:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      value={duration}
                      onChange={(e) => handleDurationChange(shot.id, parseFloat(e.target.value) || 1)}
                      className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100 font-mono text-center focus:outline-none focus:border-purple-400"
                    />
                    <span className="text-[10px] font-mono text-slate-400">s</span>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                    <button
                      onClick={() => handleMoveShotInTimeline(idx, 'earlier')}
                      disabled={idx === 0}
                      type="button"
                      className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                      title="Move Shot Earlier in Cut"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveShotInTimeline(idx, 'later')}
                      disabled={idx === sequenceShots.length - 1}
                      type="button"
                      className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                      title="Move Shot Later in Cut"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Jump Play Button */}
                  <button
                    onClick={() => {
                      setCurrentPlayIndex(idx);
                      setPlaybackTimeInCurrentShot(0);
                    }}
                    type="button"
                    className="p-2 rounded-lg bg-slate-850 hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 text-xs font-semibold"
                    title="Preview this shot"
                  >
                    Cue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human Creative Sign-Off Modal */}
      {signOffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {signOffAction === 'accept' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="text-base font-bold text-slate-100">
                  {signOffAction === 'accept' ? 'Approve Final Master Edit' : 'Request Master Edit Revision'}
                </h3>
              </div>
              <button
                onClick={() => setSignOffModalOpen(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {signOffAction === 'accept'
                ? 'Approving the master cut marks the full health video production as verified and unlocks final packaging in Export & Files.'
                : 'Requesting a re-cut records feedback for adjustments to shot timing, sequence order, or performance takes.'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Lead Reviewer / Director Name:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Creative Notes & Review Feedback:
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    signOffAction === 'accept'
                      ? 'e.g. Master pacing is excellent; anatomical fidelity and character voices verified.'
                      : 'e.g. Pacing in scene 2 needs to be tightened; shot 3 camera motion requires another take.'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSignOffModalOpen(false)}
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOff}
                type="button"
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                  signOffAction === 'accept'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {signOffAction === 'accept' ? 'Sign & Approve Master Cut' : 'Submit Re-Cut Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Audit History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Final Edit Approval Audit History
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {(!project.finalEditApproval?.history || project.finalEditApproval.history.length === 0) ? (
              <p className="text-xs text-slate-500 p-4 text-center">
                No sign-off actions recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {project.finalEditApproval.history.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <ApprovalBadge status={record.status} />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(record.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans">{record.reviewerNotes || 'Approval recorded'}</p>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Actor: {record.actor || 'human_reviewer'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setHistoryModalOpen(false)}
                type="button"
                className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
