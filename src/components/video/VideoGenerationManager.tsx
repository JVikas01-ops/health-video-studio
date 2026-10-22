import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Camera,
  CheckCircle2,
  XCircle,
  Trash2,
  FileVideo,
  Info,
  Video,
  Play,
  Film,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import type { Project, Shot, ShotStatus } from '../../types';
import { StatusBadge, ApprovalBadge, PromptCopyButton } from '../common/StatusBadge';
import {
  canProceedToVideoGeneration,
  addVideoCandidate,
  approveVideoCandidate,
  rejectVideoCandidate,
} from '../../services/stageGating';
import { generateSimulatedCameraTake } from '../../services/videoSimulationService';
import type { StudioTab } from '../layout/Sidebar';

interface VideoGenerationManagerProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const VideoGenerationManager: React.FC<VideoGenerationManagerProps> = ({
  project,
  onUpdateProject,
  onNavigateTab,
}) => {
  const [selectedShotId, setSelectedShotId] = useState<string>(
    project.scenes[0]?.shots[0]?.id || ''
  );
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
  const [isSimulatingMotion, setIsSimulatingMotion] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Find active shot and scene
  let activeShot: Shot | null = null;
  let activeScene: typeof project.scenes[0] | null = null;

  for (const scene of project.scenes) {
    for (const shot of scene.shots) {
      if (shot.id === selectedShotId) {
        activeShot = shot;
        activeScene = scene;
        break;
      }
    }
    if (activeShot) break;
  }

  // Active Take
  const activeCandidates = activeShot?.videoCandidates || [];
  const approvedTake = activeCandidates.find(
    (c) => c.id === activeShot?.approvedVideoId || c.isApprovedTake
  );
  const currentTake =
    activeCandidates.find((c) => c.id === selectedTakeId) ||
    approvedTake ||
    activeCandidates[activeCandidates.length - 1] ||
    null;

  // Active Approved Image Reference for this shot
  const approvedImageRef = activeShot?.imageCandidates?.find(
    (c) => c.id === activeShot?.approvedImageId || c.isApprovedReference
  );
  const referenceImageUrl = approvedImageRef?.imageUrl || activeShot?.attachedImageUrl;

  // Stage Gating Check
  const gateCheck = activeShot && activeScene
    ? canProceedToVideoGeneration(activeShot, activeScene, project)
    : { eligible: false, reason: 'Select a valid shot' };

  // Generate simulated camera motion take using local canvas renderer
  const handleGenerateMotionTake = async () => {
    if (!activeShot || !referenceImageUrl || isSimulatingMotion) return;

    setIsSimulatingMotion(true);
    try {
      const simResult = await generateSimulatedCameraTake({
        imageUrl: referenceImageUrl,
        cameraInstruction: activeShot.cameraInstruction,
        durationSec: activeShot.durationSec || 4,
      });

      const updatedShot = addVideoCandidate(activeShot, {
        videoUrl: simResult.videoUrl,
        prompt: activeShot.videoPrompt,
        referenceImageId: activeShot.approvedImageId,
        referenceImageUrl: referenceImageUrl,
        durationSec: activeShot.durationSec,
        provider: 'local_engine',
      });

      // Update project
      const updatedScenes = project.scenes.map((s) => ({
        ...s,
        shots: s.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
      }));

      onUpdateProject({ ...project, scenes: updatedScenes });
      // Select the newly generated candidate take
      const newTake = updatedShot.videoCandidates[updatedShot.videoCandidates.length - 1];
      if (newTake) setSelectedTakeId(newTake.id);
    } catch (err) {
      console.error('Camera motion simulation failed:', err);
      alert('Unable to generate camera motion preview. You can upload an MP4/WebM video take directly.');
    } finally {
      setIsSimulatingMotion(false);
    }
  };

  // Upload an external MP4/WebM take from Runway/Luma/Kling
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeShot) return;

    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file (MP4, WebM, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Video = reader.result as string;

      const updatedShot = addVideoCandidate(activeShot!, {
        videoUrl: base64Video,
        prompt: activeShot!.videoPrompt,
        referenceImageId: activeShot!.approvedImageId,
        referenceImageUrl: referenceImageUrl,
        durationSec: activeShot!.durationSec,
        provider: 'local_engine',
      });

      const updatedScenes = project.scenes.map((scene) => ({
        ...scene,
        shots: scene.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
      }));

      onUpdateProject({ ...project, scenes: updatedScenes });
      const newTake = updatedShot.videoCandidates[updatedShot.videoCandidates.length - 1];
      if (newTake) setSelectedTakeId(newTake.id);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Human Acceptance of a Take
  const handleApproveTake = (takeId: string) => {
    if (!activeShot) return;

    const updatedShot = approveVideoCandidate(
      activeShot,
      takeId,
      'Approved video take for final sequence timeline'
    );

    // Also update attachedVideoUrl for backward compatibility
    const approvedCand = updatedShot.videoCandidates.find((c) => c.id === takeId);
    if (approvedCand) {
      updatedShot.attachedVideoUrl = approvedCand.videoUrl;
      updatedShot.status = 'approved' as ShotStatus;
    }

    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
    }));

    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Human Rejection of a Take
  const handleConfirmReject = () => {
    if (!activeShot || !currentTake) return;

    const reason = rejectionReason.trim() || 'Camera motion or organ deformation requires revision';
    const updatedShot = rejectVideoCandidate(activeShot, currentTake.id, reason);

    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
    }));

    onUpdateProject({ ...project, scenes: updatedScenes });
    setRejectModalOpen(false);
    setRejectionReason('');
  };

  // Delete take
  const handleDeleteTake = (takeId: string) => {
    if (!activeShot) return;
    const remainingTakes = (activeShot.videoCandidates || []).filter((c) => c.id !== takeId);
    const wasApproved = activeShot.approvedVideoId === takeId;

    const updatedShot: Shot = {
      ...activeShot,
      videoCandidates: remainingTakes,
      approvedVideoId: wasApproved ? undefined : activeShot.approvedVideoId,
      attachedVideoUrl: wasApproved ? undefined : activeShot.attachedVideoUrl,
      status: wasApproved ? ('in_progress' as ShotStatus) : activeShot.status,
    };

    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
    }));

    onUpdateProject({ ...project, scenes: updatedScenes });
    setSelectedTakeId(remainingTakes[remainingTakes.length - 1]?.id || null);
  };

  // Download individual shot video file
  const handleDownloadShotVideo = (videoUrl: string, shotCode: string, takeNumber: number) => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${shotCode}_Take${takeNumber}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Hidden file input */}
      <input
        type="file"
        ref={videoFileInputRef}
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleVideoUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
              STAGE 4 GATE
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Discrete Shot Video Takes & Human Approval Controls
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Video className="w-6 h-6 text-emerald-400" />
            <span>Video Generation Manager</span>
          </h1>
        </div>

        {/* Strict Requirement Notice Banner */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            <strong>Human Approval Mandate:</strong> Generated takes are never auto-approved. Every clip requires explicit sign-off.
          </span>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Shot Reel Navigator */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              SHOT REEL LIST
            </span>
          </div>

          <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
            {project.scenes.map((scene) => (
              <div key={scene.id} className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase px-1">
                  SC0{scene.sceneNumber}: {scene.title}
                </span>

                {scene.shots.map((shot) => {
                  const isSelected = selectedShotId === shot.id;
                  const hasApprovedVideo = Boolean(
                    shot.approvedVideoId || shot.videoCandidates?.some((c) => c.isApprovedTake)
                  );
                  const hasApprovedFrame = Boolean(
                    shot.approvedImageId || shot.imageCandidates?.some((c) => c.isApprovedReference)
                  );
                  const takeCount = shot.videoCandidates?.length || 0;

                  return (
                    <button
                      key={shot.id}
                      onClick={() => {
                        setSelectedShotId(shot.id);
                        setSelectedTakeId(null);
                      }}
                      type="button"
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {shot.shotCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {shot.durationSec}s
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {shot.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasApprovedVideo ? (
                          <span
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30"
                            title="Approved Video Take"
                          >
                            ✓ Take
                          </span>
                        ) : takeCount > 0 ? (
                          <span
                            className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold border border-amber-500/30"
                            title={`${takeCount} take(s) awaiting approval`}
                          >
                            {takeCount} Takes
                          </span>
                        ) : !hasApprovedFrame ? (
                          <span className="text-[10px] text-amber-500 font-mono">🔒 Frame</span>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">No Takes</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Shot Video Production & Take Approval Bay */}
        {activeShot && activeScene && (
          <div className="lg:col-span-3 space-y-6">
            {/* Stage Gate Warning Banner if reference image is missing */}
            {!gateCheck.eligible ? (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-amber-200">
                      Stage Gate 3 Lock: Visual Reference Frame Required
                    </h3>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      {gateCheck.reason}
                    </p>
                    <p className="text-xs text-slate-400 pt-1">
                      To guarantee character consistency and visual continuity, video generation requires an explicitly approved image candidate from Image Studio.
                    </p>
                  </div>
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('images')}
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 transition"
                  >
                    <span>Launch Image Studio (Mode A/B)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : null}

            {/* Main Workbench Container */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-xl">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                    {activeShot.shotCode}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">
                      {activeShot.shotType} — Scene {activeScene.sceneNumber}: {activeScene.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{activeShot.cameraInstruction}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={activeShot.status} />
                </div>
              </div>

              {/* Side-by-Side: Approved Reference Frame (Left) & Video Take Player (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Approved Visual Reference Frame */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Approved Visual Reference</span>
                    </span>
                    {approvedImageRef && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                        LOCKED ASSET
                      </span>
                    )}
                  </div>

                  <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                    {referenceImageUrl ? (
                      <img
                        src={referenceImageUrl}
                        alt="Approved visual reference"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-xs text-slate-500">
                        No approved reference frame yet
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-2">
                    {activeShot.imagePrompt}
                  </p>
                </div>

                {/* Right: Video Candidate Take Player */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                      <Play className="w-3.5 h-3.5" />
                      <span>
                        {currentTake ? `Take #${currentTake.takeNumber}` : 'Video Take Preview'}
                      </span>
                    </span>
                    {currentTake && (
                      <ApprovalBadge status={currentTake.approvalStatus} />
                    )}
                  </div>

                  <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-lg">
                    {currentTake ? (
                      <video
                        ref={videoPlayerRef}
                        src={currentTake.videoUrl}
                        controls
                        loop
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <FileVideo className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400">No video takes recorded yet</p>
                        <p className="text-[11px] text-slate-500">
                          Click "Simulate Camera Motion" or "Attach Video (MP4)" below
                        </p>
                      </div>
                    )}
                  </div>

                  {currentTake && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Duration: {currentTake.durationSec}s</span>
                      <span>Take {currentTake.takeNumber} of {activeCandidates.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Take Candidate Strip */}
              {activeCandidates.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Recorded Candidate Takes ({activeCandidates.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Click a take to preview, accept, or reject
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeCandidates.map((take) => {
                      const isSelected = (currentTake?.id === take.id);
                      const isApproved = take.isApprovedTake || take.id === activeShot.approvedVideoId;

                      return (
                        <div
                          key={take.id}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedTakeId(take.id)}
                            type="button"
                            className="w-full text-left"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-xs text-slate-200">
                                Take #{take.takeNumber}
                              </span>
                              {isApproved ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                                  ✓ Approved
                                </span>
                              ) : (
                                <ApprovalBadge status={take.approvalStatus} />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Runtime: {take.durationSec}s
                            </span>
                          </button>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <button
                              onClick={() => setSelectedTakeId(take.id)}
                              type="button"
                              className="text-[10px] font-semibold text-cyan-400 hover:underline"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleDeleteTake(take.id)}
                              type="button"
                              className="text-slate-500 hover:text-rose-400"
                              title="Delete this take"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Take Approval & Creation Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                {/* Generation & Upload Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleGenerateMotionTake}
                    disabled={isSimulatingMotion || !gateCheck.eligible}
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 shadow flex items-center gap-2 transition"
                  >
                    {isSimulatingMotion ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Rendering Camera Motion Take...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        <span>Simulate Camera Motion Take</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={!gateCheck.eligible}
                    type="button"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload External Take (MP4/WebM)</span>
                  </button>
                </div>

                {/* Candidate Take Decision Controls (Accept / Reject) */}
                {currentTake && (
                  <div className="flex items-center gap-2">
                    {/* Download take file */}
                    <button
                      onClick={() =>
                        handleDownloadShotVideo(
                          currentTake.videoUrl,
                          activeShot.shotCode,
                          currentTake.takeNumber
                        )
                      }
                      type="button"
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition"
                      title="Download individual shot video file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Take #{currentTake.takeNumber}</span>
                    </button>

                    {/* Reject take */}
                    {currentTake.approvalStatus !== 'rejected' && (
                      <button
                        onClick={() => setRejectModalOpen(true)}
                        type="button"
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Take</span>
                      </button>
                    )}

                    {/* Accept take */}
                    {currentTake.approvalStatus !== 'approved' && (
                      <button
                        onClick={() => handleApproveTake(currentTake.id)}
                        type="button"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Take for Final Edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* External Video Generator Prompts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" />
                      <span>EXTERNAL VIDEO PROMPT</span>
                    </span>
                    <PromptCopyButton text={activeShot.videoPrompt} label="Copy Prompt" />
                  </div>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                    {activeShot.videoPrompt}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Target engines: Runway Gen-3 Alpha, Luma Dream Machine, Kling AI, Pika Labs, OpenAI Sora
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>CAMERA MOTION & TIMING</span>
                    </span>
                    <PromptCopyButton
                      text={`${activeShot.shotType}, ${activeShot.cameraInstruction}. Runtime: ${activeShot.durationSec}s.`}
                      label="Copy Specs"
                    />
                  </div>
                  <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60 text-xs">
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase block">
                        Framing & Motion:
                      </span>
                      <span className="text-slate-200 font-semibold">
                        {activeShot.shotType} • {activeShot.cameraInstruction}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono text-[10px] uppercase block">
                        Action Notes:
                      </span>
                      <span className="text-slate-300">{activeShot.description}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && currentTake && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Reject Take #{currentTake.takeNumber}
                </h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              State the reason for rejecting this video take. The take will be marked as rejected and retained in the candidate archive without overwriting.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Camera motion too jittery; organ lighting inconsistent with reference image..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRejectModalOpen(false)}
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                type="button"
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
