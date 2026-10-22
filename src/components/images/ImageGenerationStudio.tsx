import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Upload,
  Lock,
  Columns,
  Maximize2,
  Check,
  FileEdit,
  ShieldCheck,
} from 'lucide-react';
import type {
  Project,
  Shot,
  ImageCandidate,
  ApprovalStatus,
} from '../../types';
import { ApprovalBadge, PromptCopyButton } from '../common/StatusBadge';
import {
  canProceedToImageGeneration,
  canProceedToScenePlanning,
  addImageCandidate,
  approveImageCandidate,
  rejectImageCandidate,
} from '../../services/stageGating';
import { generateShotImage } from '../../services/imageGenerationService';
import type { StudioTab } from '../layout/Sidebar';

interface ImageGenerationStudioProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const ImageGenerationStudio: React.FC<ImageGenerationStudioProps> = ({
  project,
  onUpdateProject,
  onNavigateTab,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(project.scenes[0]?.id || '');
  const [selectedShotId, setSelectedShotId] = useState<string>(
    project.scenes[0]?.shots[0]?.id || ''
  );

  // Mode B variations count: 3 or 4
  const [variationCount, setVariationCount] = useState<3 | 4>(3);
  const [isGenerating, setIsGenerating] = useState(false);

  // Lightbox Preview Modal
  const [lightboxCandidate, setLightboxCandidate] = useState<ImageCandidate | null>(null);

  // Compare Modal (Side-by-side comparison of 2 or more candidates)
  const [comparingCandidates, setComparingCandidates] = useState<ImageCandidate[] | null>(null);

  // Reject Reason Modal
  const [rejectingCandidateId, setRejectingCandidateId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Editable prompt states
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [negativePromptText, setNegativePromptText] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const currentScene = project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0];
  const currentShot =
    currentScene?.shots.find((sh) => sh.id === selectedShotId) || currentScene?.shots[0];

  const scriptGate = canProceedToScenePlanning(project);
  const sceneGate = currentScene ? canProceedToImageGeneration(currentScene, project) : { eligible: false };

  // Switch active shot and sync prompt
  const handleSelectShot = (shot: Shot, sceneId: string) => {
    setSelectedSceneId(sceneId);
    setSelectedShotId(shot.id);
    setPromptText(shot.imagePrompt);
    setEditingPrompt(false);
  };

  // Switch between Mode A (single) and Mode B (variations)
  const handleToggleMode = (mode: 'single' | 'variations') => {
    if (!currentScene || !currentShot) return;
    const updatedScenes = project.scenes.map((s) => {
      if (s.id !== currentScene.id) return s;
      return {
        ...s,
        shots: s.shots.map((sh) => (sh.id === currentShot.id ? { ...sh, imageGenerationMode: mode } : sh)),
      };
    });
    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Generate Image(s)
  const handleGenerate = async () => {
    if (!currentScene || !currentShot || isGenerating) return;

    const primaryCharId = currentShot.characterIds[0];
    const primaryChar = project.characters.find((c) => c.id === primaryCharId);
    const activePrompt = promptText.trim() || currentShot.imagePrompt;
    const mode = currentShot.imageGenerationMode || 'single';
    const countToGenerate = mode === 'single' ? 1 : variationCount;

    setIsGenerating(true);

    try {
      let updatedShot = { ...currentShot };

      for (let i = 0; i < countToGenerate; i++) {
        const result = await generateShotImage({
          shotCode: currentShot.shotCode,
          shotType: currentShot.shotType,
          prompt: activePrompt,
          negativePrompt: negativePromptText,
          environment: currentScene.environment,
          characterOrgan: primaryChar?.organType,
          characterName: primaryChar?.name,
          characterColor: primaryChar?.colorBadge,
          variationIndex: mode === 'single' ? updatedShot.imageCandidates.length : i + 1,
          aspectRatio: project.settings.aspectRatio,
        });

        updatedShot = addImageCandidate(updatedShot, {
          imageUrl: result.imageUrl,
          prompt: activePrompt,
          variationIndex: mode === 'single' ? updatedShot.imageCandidates.length : i + 1,
          provider: result.provider,
          model: result.model,
          generationMode: mode,
        });
      }

      // Update project state
      const updatedScenes = project.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          shots: s.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
        };
      });

      onUpdateProject({ ...project, scenes: updatedScenes });
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Accept candidate as approved visual reference
  const handleApproveCandidate = (candidateId: string) => {
    if (!currentScene || !currentShot) return;

    const updatedShot = approveImageCandidate(currentShot, candidateId, 'Approved visual reference for video generation');
    const updatedScenes = project.scenes.map((s) => {
      if (s.id !== currentScene.id) return s;
      return {
        ...s,
        shots: s.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
      };
    });

    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  // Reject candidate with reason
  const handleConfirmReject = () => {
    if (!currentScene || !currentShot || !rejectingCandidateId) return;

    const reason = rejectionReason.trim() || 'Visual composition does not match art direction';
    const updatedShot = rejectImageCandidate(currentShot, rejectingCandidateId, reason);

    const updatedScenes = project.scenes.map((s) => {
      if (s.id !== currentScene.id) return s;
      return {
        ...s,
        shots: s.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
      };
    });

    onUpdateProject({ ...project, scenes: updatedScenes });
    setRejectingCandidateId(null);
    setRejectionReason('');
  };

  // Regenerate an alternative for a specific candidate
  const handleRegenerateCandidate = async (candidate: ImageCandidate) => {
    if (!currentScene || !currentShot || !sceneGate.eligible || isGenerating) return;

    setIsGenerating(true);
    try {
      const primaryChar = project.characters.find((c) => c.id === currentShot.characterIds[0]);
      const result = await generateShotImage({
        shotCode: currentShot.shotCode,
        shotType: currentShot.shotType,
        prompt: candidate.prompt || currentShot.imagePrompt,
        environment: currentScene.environment,
        characterOrgan: primaryChar?.organType,
        characterName: primaryChar?.name,
        characterColor: primaryChar?.colorBadge,
        variationIndex: candidate.variationIndex,
        aspectRatio: project.settings.aspectRatio,
      });

      const updatedShot = addImageCandidate(currentShot, {
        imageUrl: result.imageUrl,
        prompt: candidate.prompt,
        variationIndex: candidate.variationIndex,
        provider: result.provider,
        model: result.model,
        generationMode: currentShot.imageGenerationMode,
      });

      const updatedScenes = project.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          shots: s.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
        };
      });

      onUpdateProject({ ...project, scenes: updatedScenes });
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload custom PNG image into candidate list
  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentScene || !currentShot || !sceneGate.eligible) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const updatedShot = addImageCandidate(currentShot, {
        imageUrl: base64Url,
        prompt: currentShot.imagePrompt,
        variationIndex: currentShot.imageCandidates.length + 1,
        provider: 'local_engine',
        model: 'Manual Upload',
        generationMode: currentShot.imageGenerationMode,
      });

      const updatedScenes = project.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          shots: s.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
        };
      });

      onUpdateProject({ ...project, scenes: updatedScenes });
    };
    reader.readAsDataURL(file);
  };

  // Save edited prompt
  const handleSavePrompt = () => {
    if (!currentScene || !currentShot) return;
    const updatedScenes = project.scenes.map((s) => {
      if (s.id !== currentScene.id) return s;
      return {
        ...s,
        shots: s.shots.map((sh) => (sh.id === currentShot.id ? { ...sh, imagePrompt: promptText.trim() } : sh)),
      };
    });
    onUpdateProject({ ...project, scenes: updatedScenes });
    setEditingPrompt(false);
  };

  // Approved reference candidate
  const approvedReference = currentShot?.imageCandidates.find(
    (c) => c.id === currentShot.approvedImageId && c.approvalStatus === 'approved'
  ) || (currentShot?.attachedImageUrl && currentShot?.approvalStatus === 'approved'
    ? { id: 'legacy-approved', imageUrl: currentShot.attachedImageUrl, prompt: currentShot.imagePrompt, approvalStatus: 'approved' as ApprovalStatus, createdAt: '', isApprovedReference: true, variationIndex: 0, approvalHistory: [] }
    : undefined);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Hidden file uploader */}
      <input
        type="file"
        ref={uploadInputRef}
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUploadImageFile}
        className="hidden"
      />

      {/* STAGE GATE WARNING BANNERS */}
      {!scriptGate.eligible && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs">
              <strong>Stage 1 Script Gate:</strong> Script must be approved before generating storyboard images.
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('script')}
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0"
            >
              Go to Script Studio →
            </button>
          )}
        </div>
      )}

      {scriptGate.eligible && !sceneGate.eligible && currentScene && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs">
              <strong>Stage 2 Scene Gate:</strong> Scene {currentScene.sceneNumber} ({currentScene.title}) is currently "{currentScene.approval?.status || 'draft'}". Scene approval is required before image generation.
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('shots')}
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0"
            >
              Review Scene Approval →
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-cyan-400 font-semibold tracking-wider">
              CORE FEATURE 3 & STAGE 3
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Image Generation Studio: Mode A & Mode B Comparison Rig
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Image Generation Studio
          </h1>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3">
          {approvedReference && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('video')}
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow flex items-center gap-1.5 transition"
            >
              <span>Proceed to Video Generation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Shot Reel Navigator */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              SELECT SHOT
            </span>
          </div>

          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {project.scenes.map((scene) => (
              <div key={scene.id} className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    SC0{scene.sceneNumber}: {scene.title}
                  </span>
                  <ApprovalBadge status={scene.approval?.status || 'draft'} className="text-[9px] py-0 px-1" />
                </div>

                {scene.shots.map((shot) => {
                  const isSelected = currentShot?.id === shot.id;
                  const hasApprovedImg = Boolean(
                    shot.approvedImageId || (shot.attachedImageUrl && shot.approvalStatus === 'approved')
                  );
                  const candidateCount = shot.imageCandidates?.length || (shot.attachedImageUrl ? 1 : 0);

                  return (
                    <button
                      key={shot.id}
                      onClick={() => handleSelectShot(shot, scene.id)}
                      type="button"
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {shot.shotCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {shot.shotType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {shot.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasApprovedImg ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" title="Visual Reference Approved" />
                        ) : candidateCount > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" title={`${candidateCount} candidate(s)`} />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {candidateCount} takes
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Shot Image Generation & Comparison Workbench */}
        {currentShot && (
          <div className="lg:col-span-3 space-y-6">
            {/* Shot Context & Generation Controls Console */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30">
                    {currentShot.shotCode}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-100">
                      {currentShot.shotType} — {currentScene.title}
                    </h2>
                    <p className="text-xs text-slate-400">{currentShot.cameraInstruction}</p>
                  </div>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handleToggleMode('single')}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      (currentShot.imageGenerationMode || 'single') === 'single'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    MODE A: Single
                  </button>
                  <button
                    onClick={() => handleToggleMode('variations')}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      currentShot.imageGenerationMode === 'variations'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>MODE B: Variations</span>
                  </button>
                </div>
              </div>

              {/* Mode B: 3 vs 4 selector */}
              {currentShot.imageGenerationMode === 'variations' && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Columns className="w-4 h-4 text-cyan-400" />
                    <span>Mode B Multi-Variation Setting:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setVariationCount(3)}
                      type="button"
                      className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition ${
                        variationCount === 3
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      3 Variations
                    </button>
                    <button
                      onClick={() => setVariationCount(4)}
                      type="button"
                      className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition ${
                        variationCount === 4
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      4 Variations
                    </button>
                  </div>
                </div>
              )}

              {/* Prompt Editor & Generator Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                    <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visual Prompt (Midjourney / FLUX)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <PromptCopyButton text={currentShot.imagePrompt} label="Copy Prompt" />
                    <button
                      onClick={() => {
                        if (editingPrompt) {
                          handleSavePrompt();
                        } else {
                          setPromptText(currentShot.imagePrompt);
                          setEditingPrompt(true);
                        }
                      }}
                      type="button"
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                    >
                      {editingPrompt ? 'Save Changes' : 'Edit Prompt'}
                    </button>
                  </div>
                </div>

                {editingPrompt ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Positive Prompt:
                      </label>
                      <textarea
                        rows={3}
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Negative Prompt (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. blurry, low quality, distorted anatomy, watermark"
                        value={negativePromptText}
                        onChange={(e) => setNegativePromptText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPrompt(false)}
                        type="button"
                        className="px-3 py-1 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePrompt}
                        type="button"
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    {currentShot.imagePrompt}
                  </p>
                )}
              </div>

              {/* Generation Trigger Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !sceneGate.eligible}
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 shadow-md flex items-center gap-2 transition active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Rendering Frame(s)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {currentShot.imageGenerationMode === 'variations'
                            ? `Generate ${variationCount} Variations (Mode B)`
                            : 'Generate Candidate (Mode A)'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={!sceneGate.eligible}
                    type="button"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload Image</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Engine: Local Studio Renderer (Offline verified)
                </div>
              </div>

              {/* Approved Visual Reference Lock Indicator Banner */}
              {approvedReference && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Approved Visual Reference Locked</div>
                      <p className="text-[11px] text-emerald-300/80">
                        This approved image reference will guide video generation. Generating alternatives preserves this record without overwriting.
                      </p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-lg border border-emerald-500/40 overflow-hidden shrink-0">
                    <img src={approvedReference.imageUrl} alt="Approved reference" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Image Cards & Comparison Matrix */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    CANDIDATE IMAGES ({currentShot.imageCandidates.length})
                  </h3>
                </div>

                {currentShot.imageCandidates.length >= 2 && (
                  <button
                    onClick={() => setComparingCandidates(currentShot.imageCandidates)}
                    type="button"
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Compare All Side-by-Side</span>
                  </button>
                )}
              </div>

              {currentShot.imageCandidates.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No candidate images generated yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Click "Generate Candidate" above to render in Mode A or Mode B.
                  </p>
                </div>
              ) : (
                <div
                  className={`grid gap-4 ${
                    currentShot.imageGenerationMode === 'variations'
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {currentShot.imageCandidates.map((candidate, idx) => {
                    const isApproved =
                      candidate.id === currentShot.approvedImageId || candidate.approvalStatus === 'approved';
                    const isRejected = candidate.approvalStatus === 'rejected';

                    return (
                      <div
                        key={candidate.id}
                        className={`rounded-2xl border transition flex flex-col justify-between overflow-hidden group shadow-lg ${
                          isApproved
                            ? 'bg-emerald-950/20 border-emerald-500/60 shadow-emerald-950/20'
                            : isRejected
                            ? 'bg-rose-950/15 border-rose-900/50 opacity-75'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Image Frame with Badge */}
                        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer"
                          onClick={() => setLightboxCandidate(candidate)}
                        >
                          <img
                            src={candidate.imageUrl}
                            alt={`Candidate variation ${candidate.variationIndex}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Top Tags */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono font-bold text-slate-200">
                              VAR #{candidate.variationIndex || idx + 1}
                            </span>
                            <ApprovalBadge status={candidate.approvalStatus} className="text-[9px] py-0 px-1.5" />
                          </div>

                          {/* Quick Lightbox Zoom Button */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg bg-black/75 hover:bg-black text-white"
                              title="Full-size Preview"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Approved Reference Banner Tag */}
                          {isApproved && (
                            <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 backdrop-blur py-1 px-2.5 text-[10px] font-bold text-white text-center flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved Visual Reference</span>
                            </div>
                          )}
                        </div>

                        {/* Candidate Details & Actions */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-300 font-mono line-clamp-2" title={candidate.prompt}>
                              {candidate.prompt}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                              <span>{candidate.metadata?.model || 'Local Engine'}</span>
                              <span>{new Date(candidate.createdAt).toLocaleTimeString()}</span>
                            </div>
                            {candidate.rejectionReason && (
                              <p className="text-[10px] text-rose-400 italic">
                                Rejection: "{candidate.rejectionReason}"
                              </p>
                            )}
                          </div>

                          {/* Action Button Row */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                            {/* Accept Button */}
                            {!isApproved ? (
                              <button
                                onClick={() => handleApproveCandidate(candidate.id)}
                                type="button"
                                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-emerald-600/80 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                            ) : (
                              <span className="flex-1 py-1.5 text-center text-xs font-bold text-emerald-400 font-mono">
                                ✓ Approved
                              </span>
                            )}

                            {/* Reject Button */}
                            {!isRejected && (
                              <button
                                onClick={() => setRejectingCandidateId(candidate.id)}
                                type="button"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                                title="Reject Candidate"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Regenerate specific alternative */}
                            <button
                              onClick={() => handleRegenerateCandidate(candidate)}
                              disabled={isGenerating || !sceneGate.eligible}
                              type="button"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 disabled:opacity-50"
                              title="Regenerate this variation"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Full-Size Lightbox Preview */}
      {lightboxCandidate && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 animate-scaleUp max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  Variation #{lightboxCandidate.variationIndex}
                </span>
                <ApprovalBadge status={lightboxCandidate.approvalStatus} />
              </div>
              <button
                onClick={() => setLightboxCandidate(null)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* High-res Image preview */}
            <div className="w-full aspect-video rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800">
              <img
                src={lightboxCandidate.imageUrl}
                alt="Full size candidate preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Prompt & Metadata Details */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-mono uppercase font-bold">GENERATION PROMPT:</span>
                <PromptCopyButton text={lightboxCandidate.prompt} />
              </div>
              <p className="text-slate-200 font-mono leading-relaxed">{lightboxCandidate.prompt}</p>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 font-mono pt-1 text-[11px] border-t border-slate-900">
                <span>Provider: {lightboxCandidate.metadata?.provider || 'local_engine'}</span>
                <span>Created: {new Date(lightboxCandidate.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setLightboxCandidate(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close Preview
              </button>

              <div className="flex items-center gap-2">
                {lightboxCandidate.approvalStatus !== 'approved' && (
                  <button
                    onClick={() => {
                      handleApproveCandidate(lightboxCandidate.id);
                      setLightboxCandidate(null);
                    }}
                    type="button"
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve as Visual Reference</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Side-by-Side Comparison Modal */}
      {comparingCandidates && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full p-6 shadow-2xl space-y-4 animate-scaleUp max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Side-by-Side Candidate Comparison ({comparingCandidates.length} Variations)
                </h3>
              </div>
              <button
                onClick={() => setComparingCandidates(null)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className={`grid gap-4 ${
              comparingCandidates.length === 2 ? 'grid-cols-2' : comparingCandidates.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
            }`}>
              {comparingCandidates.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                    <img src={c.imageUrl} alt="Candidate take" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-300">
                      VAR #{c.variationIndex}
                    </span>
                    <ApprovalBadge status={c.approvalStatus} className="text-[9px] py-0 px-1.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-2">{c.prompt}</p>

                  <button
                    onClick={() => {
                      handleApproveCandidate(c.id);
                      setComparingCandidates(null);
                    }}
                    type="button"
                    className="w-full py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Select & Approve</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setComparingCandidates(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Rejection Reason Input Modal */}
      {rejectingCandidateId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-slate-100">Reject Image Candidate</h3>
              </div>
              <button
                onClick={() => setRejectingCandidateId(null)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Please enter the director feedback for rejecting this candidate image. This note will be recorded in the candidate history for auditing.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Rejection Feedback</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Character expression is too angry, background color clashes with stomach scene..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setRejectingCandidateId(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
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
