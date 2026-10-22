import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Camera,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Lock,
  ArrowRight,
  ShieldAlert,
  History,
} from 'lucide-react';
import type { Project, Scene, Shot, ShotType, ShotStatus, ApprovalStatus } from '../../types';
import { StatusBadge, ApprovalBadge, PromptCopyButton } from '../common/StatusBadge';
import {
  canProceedToScenePlanning,
  canProceedToImageGeneration,
  createApprovalRecord,
  flagDependentAssetsForReview,
} from '../../services/stageGating';
import type { StudioTab } from '../layout/Sidebar';

interface SceneShotManagerProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const SceneShotManager: React.FC<SceneShotManagerProps> = ({
  project,
  onUpdateProject,
  onNavigateTab,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(project.scenes[0]?.id || '');
  const [editingShot, setEditingShot] = useState<Shot | null>(null);

  // Approval action states
  const [sceneApprovalModal, setSceneApprovalModal] = useState<{
    sceneId: string;
    action: 'accept' | 'reject' | 'revise';
  } | null>(null);
  const [sceneReviewNotes, setSceneReviewNotes] = useState('');
  const [showSceneHistoryModal, setShowSceneHistoryModal] = useState(false);

  const scriptGate = canProceedToScenePlanning(project);
  const currentScene = project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0];

  // Helper to re-index scenes & shots properly
  const reindexProject = (scenes: Scene[]): Scene[] =>
    scenes.map((scene, sIdx) => {
      const sceneNumber = sIdx + 1;
      const shots = scene.shots.map((sh, shIdx) => ({
        ...sh,
        order: shIdx + 1,
        shotCode: `SC0${sceneNumber}-SH0${shIdx + 1}`,
      }));
      return {
        ...scene,
        order: sceneNumber,
        sceneNumber,
        shots,
      };
    });

  // Scene Approval Action Handlers
  const handleConfirmSceneApproval = () => {
    if (!sceneApprovalModal || !currentScene) return;

    const { action } = sceneApprovalModal;
    const timestamp = new Date().toISOString();
    let newStatus: ApprovalStatus = 'approved';
    let defaultNote = '';

    if (action === 'accept') {
      newStatus = 'approved';
      defaultNote = sceneReviewNotes.trim() || `Scene ${currentScene.sceneNumber} (${currentScene.title}) approved for asset generation.`;
    } else if (action === 'reject') {
      newStatus = 'rejected';
      defaultNote = sceneReviewNotes.trim() || `Scene ${currentScene.sceneNumber} rejected by director.`;
    } else if (action === 'revise') {
      newStatus = 'needs_revision';
      defaultNote = sceneReviewNotes.trim() || `Revision requested for Scene ${currentScene.sceneNumber}.`;
    }

    const historyRecord = createApprovalRecord(
      newStatus,
      defaultNote,
      currentScene.approval?.status,
      'human_reviewer'
    );

    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== currentScene.id) return scene;
      return {
        ...scene,
        approval: {
          status: newStatus,
          history: [...(scene.approval?.history || []), historyRecord],
          notes: defaultNote,
          lastReviewedAt: timestamp,
          needsReview: false,
          reviewReason: undefined,
        },
      };
    });

    let updatedProject: Project = { ...project, scenes: updatedScenes };

    if (action === 'revise') {
      updatedProject = flagDependentAssetsForReview(
        updatedProject,
        'scene',
        currentScene.id,
        defaultNote
      );
    }

    onUpdateProject(updatedProject);
    setSceneApprovalModal(null);
    setSceneReviewNotes('');
  };

  // Reorder Scenes (Up/Down)
  const handleMoveScene = (sceneId: string, direction: 'up' | 'down') => {
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === project.scenes.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...project.scenes];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    const indexed = reindexProject(reordered);
    const updatedProject = flagDependentAssetsForReview(
      { ...project, scenes: indexed },
      'scene',
      sceneId,
      'Scene order modified'
    );
    onUpdateProject(updatedProject);
  };

  // Reorder Shots (Up/Down)
  const handleMoveShot = (shotId: string, direction: 'up' | 'down') => {
    if (!currentScene) return;
    const idx = currentScene.shots.findIndex((sh) => sh.id === shotId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === currentScene.shots.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reorderedShots = [...currentScene.shots];
    const [moved] = reorderedShots.splice(idx, 1);
    reorderedShots.splice(targetIdx, 0, moved);

    const reindexedShots = reorderedShots.map((sh, sIdx) => ({
      ...sh,
      order: sIdx + 1,
      shotCode: `SC0${currentScene.sceneNumber}-SH0${sIdx + 1}`,
    }));

    const updatedScenes = project.scenes.map((s) =>
      s.id === currentScene.id ? { ...s, shots: reindexedShots } : s
    );

    const updatedProject = flagDependentAssetsForReview(
      { ...project, scenes: updatedScenes },
      'scene',
      currentScene.id,
      'Shot order was rearranged'
    );
    onUpdateProject(updatedProject);
  };

  // Add new shot to current scene
  const handleAddShot = () => {
    if (!currentScene) return;
    const newShotIndex = currentScene.shots.length + 1;
    const newShotId = `shot-${currentScene.id}-${Date.now()}`;
    const shotCode = `SC0${currentScene.sceneNumber}-SH0${newShotIndex}`;
    const defaultChar = project.characters[0];

    const newShot: Shot = {
      id: newShotId,
      sceneId: currentScene.id,
      order: newShotIndex,
      shotCode,
      shotType: 'Medium Shot (MS)',
      cameraInstruction: 'Steady cinematic push in on character expression',
      description: 'Describe what the organs are doing in this shot...',
      characterIds: [defaultChar?.id || ''].filter(Boolean),
      dialogues: [
        {
          id: `dlg-${newShotId}-1`,
          characterId: defaultChar?.id || '',
          characterName: defaultChar?.name || 'Character',
          line: 'Important health message line...',
          durationSec: 4,
          approvalStatus: 'draft',
          approvalHistory: [],
        },
      ],
      imagePrompt: `${defaultChar?.promptConsistencyPrefix || '3D Pixar character'}, inside ${currentScene.environment}, cinematic volumetric lighting, 8k octanerender`,
      videoPrompt: `Smooth 3D animated camera move inside ${currentScene.environment}, organ character speaking with expressive facial animation`,
      approvalStatus: 'draft',
      approvalHistory: [],
      imageGenerationMode: 'single',
      imageCandidates: [],
      videoCandidates: [],
      status: 'planned',
      soundEffects: [],
      durationSec: 5,
    };

    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== currentScene.id) return scene;
      return {
        ...scene,
        shots: [...scene.shots, newShot],
      };
    });

    const updatedProject = flagDependentAssetsForReview(
      { ...project, scenes: updatedScenes },
      'scene',
      currentScene.id,
      'New shot added to scene'
    );
    onUpdateProject(updatedProject);
  };

  // Duplicate Shot
  const handleDuplicateShot = (shot: Shot) => {
    if (!currentScene) return;
    const newShotId = `shot-${currentScene.id}-${Date.now()}`;
    const newShotIndex = currentScene.shots.length + 1;

    const duplicatedShot: Shot = {
      ...shot,
      id: newShotId,
      order: newShotIndex,
      shotCode: `SC0${currentScene.sceneNumber}-SH0${newShotIndex}`,
      status: 'planned',
      approvalStatus: 'draft',
      approvalHistory: [],
      imageGenerationMode: shot.imageGenerationMode || 'single',
      imageCandidates: [],
      videoCandidates: [],
      approvedImageId: undefined,
      approvedVideoId: undefined,
      attachedImageUrl: undefined,
      attachedVideoUrl: undefined,
    };

    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== currentScene.id) return scene;
      return {
        ...scene,
        shots: [...scene.shots, duplicatedShot],
      };
    });

    const updatedProject = flagDependentAssetsForReview(
      { ...project, scenes: updatedScenes },
      'scene',
      currentScene.id,
      'Shot was duplicated'
    );
    onUpdateProject(updatedProject);
  };

  // Delete Shot
  const handleDeleteShot = (shotId: string) => {
    if (!currentScene || currentScene.shots.length <= 1) {
      alert('Every scene must have at least one shot.');
      return;
    }

    const filtered = currentScene.shots.filter((sh) => sh.id !== shotId);
    const reindexedShots = filtered.map((sh, idx) => ({
      ...sh,
      order: idx + 1,
      shotCode: `SC0${currentScene.sceneNumber}-SH0${idx + 1}`,
    }));

    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== currentScene.id) return scene;
      return {
        ...scene,
        shots: reindexedShots,
      };
    });

    const updatedProject = flagDependentAssetsForReview(
      { ...project, scenes: updatedScenes },
      'scene',
      currentScene.id,
      'Shot removed from scene'
    );
    onUpdateProject(updatedProject);
  };

  // Update Shot
  const handleUpdateShot = (updatedShot: Shot) => {
    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== updatedShot.sceneId) return scene;
      return {
        ...scene,
        shots: scene.shots.map((sh) => (sh.id === updatedShot.id ? updatedShot : sh)),
      };
    });

    onUpdateProject({ ...project, scenes: updatedScenes });
    setEditingShot(null);
  };

  // Quick status toggle
  const handleQuickStatusChange = (shotId: string, status: ShotStatus) => {
    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== currentScene.id) return scene;
      return {
        ...scene,
        shots: scene.shots.map((sh) => (sh.id === shotId ? { ...sh, status } : sh)),
      };
    });
    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  const currentSceneGate = currentScene ? canProceedToImageGeneration(currentScene, project) : { eligible: false };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* STAGE GATE 1 LOCKOUT BANNER (if script is unapproved) */}
      {!scriptGate.eligible && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300">
                Stage 2 Gate Locked: Script Approval Required
              </h3>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {scriptGate.reason}
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('script')}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 shrink-0 shadow transition"
            >
              <span>Review & Approve Script</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
              CORE FEATURE 4 & STAGE 2
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Scene Approval, Staging & Shot Reordering
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Scene & Shot Manager
          </h1>
        </div>

        <button
          onClick={handleAddShot}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Shot to Scene</span>
        </button>
      </div>

      {/* Scene Tabs Ribbon with Reorder Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80">
        {project.scenes.map((scene, idx) => {
          const isSelected = selectedSceneId === scene.id;

          return (
            <div key={scene.id} className="flex items-center shrink-0 group">
              <button
                onClick={() => setSelectedSceneId(scene.id)}
                type="button"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  SC0{scene.sceneNumber}
                </span>
                <span className="truncate max-w-[140px]">{scene.title}</span>
                <ApprovalBadge status={scene.approval?.status || 'draft'} className="text-[9px] py-0 px-1.5" />
              </button>

              {/* Reorder Buttons */}
              <div className="flex items-center gap-0.5 ml-1 opacity-60 hover:opacity-100">
                <button
                  onClick={() => handleMoveScene(scene.id, 'up')}
                  disabled={idx === 0}
                  type="button"
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-400"
                  title="Move Scene Up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMoveScene(scene.id, 'down')}
                  disabled={idx === project.scenes.length - 1}
                  type="button"
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-400"
                  title="Move Scene Down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Scene Approval Control Console */}
      {currentScene && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
          {/* Review Request Alert if flagged by upstream changes */}
          {currentScene.approval?.needsReview && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Review Required:</strong> {currentScene.approval.reviewReason || 'Upstream script was modified.'} Please verify shot framing and dialogue before re-approving.
                </span>
              </div>
              <button
                onClick={() => setSceneApprovalModal({ sceneId: currentScene.id, action: 'accept' })}
                type="button"
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
              >
                Re-Approve Scene
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                  SCENE {currentScene.sceneNumber} APPROVAL:
                </span>
                <ApprovalBadge status={currentScene.approval?.status || 'draft'} />
                {currentSceneGate.eligible ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ✓ Unlocks Image Gen for Shots
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    🔒 Image Gen Locked
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-100">{currentScene.title}</h2>
              <p className="text-xs text-slate-400">{currentScene.environment} • {currentScene.description}</p>
            </div>

            {/* Approval Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowSceneHistoryModal(true)}
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5"
                title="Scene Approval History"
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({currentScene.approval?.history?.length || 0})</span>
              </button>

              {currentScene.approval?.status !== 'approved' || currentScene.approval?.needsReview ? (
                <>
                  <button
                    onClick={() => setSceneApprovalModal({ sceneId: currentScene.id, action: 'accept' })}
                    type="button"
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow flex items-center gap-1.5 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Scene</span>
                  </button>

                  <button
                    onClick={() => setSceneApprovalModal({ sceneId: currentScene.id, action: 'revise' })}
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    onClick={() => setSceneApprovalModal({ sceneId: currentScene.id, action: 'reject' })}
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSceneApprovalModal({ sceneId: currentScene.id, action: 'revise' })}
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Revoke & Revise Scene</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shots List Cards */}
      {currentScene && (
        <div className="space-y-4">
          {currentScene.shots.map((shot, shotIdx) => {
            const assignedCharacters = project.characters.filter((c) =>
              shot.characterIds.includes(c.id)
            );

            return (
              <div
                key={shot.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition space-y-4 shadow-sm"
              >
                {/* Shot Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                      {shot.shotCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{shot.shotType}</span>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{shot.cameraInstruction}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Shot Reorder Buttons */}
                    <div className="flex items-center gap-1 mr-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => handleMoveShot(shot.id, 'up')}
                        disabled={shotIdx === 0}
                        type="button"
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                        title="Move Shot Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveShot(shot.id, 'down')}
                        disabled={shotIdx === currentScene.shots.length - 1}
                        type="button"
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                        title="Move Shot Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Shot Status"
                        value={shot.status}
                        onChange={(e) =>
                          handleQuickStatusChange(shot.id, e.target.value as ShotStatus)
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
                      >
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="generated">Generated</option>
                        <option value="approved">Approved</option>
                      </select>
                      <StatusBadge status={shot.status} />
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleDuplicateShot(shot)}
                      type="button"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                      title="Duplicate Shot"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteShot(shot.id)}
                      type="button"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                      title="Delete Shot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Shot Description & Action */}
                <div className="text-xs text-slate-200 leading-relaxed font-sans">
                  {shot.description}
                </div>

                {/* Assigned Characters & Dialogue preview */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">CAST IN SHOT:</span>
                  {assignedCharacters.length > 0 ? (
                    assignedCharacters.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${c.colorBadge}15`,
                          color: c.colorBadge,
                          border: `1px solid ${c.colorBadge}40`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: c.colorBadge }}
                        />
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No character assigned</span>
                  )}

                  <span className="text-slate-700">|</span>
                  <span className="text-xs text-slate-400 font-mono">
                    Runtime: {shot.durationSec}s
                  </span>
                </div>

                {/* Prompts Section (Image & Video Generation) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Image Generation Prompt */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>IMAGE PROMPT (Midjourney / FLUX)</span>
                      </span>
                      <PromptCopyButton text={shot.imagePrompt} />
                    </div>
                    <p className="text-xs text-slate-300 font-mono line-clamp-3 bg-slate-900/60 p-2 rounded border border-slate-800/60">
                      {shot.imagePrompt}
                    </p>
                  </div>

                  {/* Video Generation Prompt */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        <span>VIDEO PROMPT (Runway / Luma / Kling)</span>
                      </span>
                      <PromptCopyButton text={shot.videoPrompt} />
                    </div>
                    <p className="text-xs text-slate-300 font-mono line-clamp-3 bg-slate-900/60 p-2 rounded border border-slate-800/60">
                      {shot.videoPrompt}
                    </p>
                  </div>
                </div>

                {/* Edit Button & Gate Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 mt-2">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    {currentSceneGate.eligible ? (
                      <span className="text-emerald-400">✓ Ready for Phase 3 Image Generation</span>
                    ) : (
                      <span className="text-amber-400">🔒 Approve Scene to unlock Image Gen</span>
                    )}
                    {shot.approvedImageId ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        ✓ Reference Frame Locked
                      </span>
                    ) : shot.imageCandidates && shot.imageCandidates.length > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                        {shot.imageCandidates.length} Variation(s) Review
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentSceneGate.eligible && onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('images')}
                        type="button"
                        className="text-xs font-bold text-cyan-300 hover:text-cyan-200 px-3 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 transition flex items-center gap-1.5"
                      >
                        <span>Image Studio (Mode A/B)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingShot(shot)}
                      type="button"
                      className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                    >
                      Edit Shot Specs & Prompts
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Confirm Scene Approval / Rejection / Revision */}
      {sceneApprovalModal && currentScene && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {sceneApprovalModal.action === 'accept' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {sceneApprovalModal.action === 'revise' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {sceneApprovalModal.action === 'reject' && <XCircle className="w-5 h-5 text-rose-400" />}
                <h3 className="text-base font-bold text-slate-100">
                  {sceneApprovalModal.action === 'accept' && `Approve Scene ${currentScene.sceneNumber}`}
                  {sceneApprovalModal.action === 'revise' && `Request Revision: Scene ${currentScene.sceneNumber}`}
                  {sceneApprovalModal.action === 'reject' && `Reject Scene ${currentScene.sceneNumber}`}
                </h3>
              </div>
              <button
                onClick={() => setSceneApprovalModal(null)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {sceneApprovalModal.action === 'accept' &&
                `Approving Scene ${currentScene.sceneNumber} unlocks Stage 3: Image Generation for all ${currentScene.shots.length} shots within this environment.`}
              {sceneApprovalModal.action === 'revise' &&
                'Requesting revision flags this scene and its shots for revision, blocking image generation until re-approved.'}
              {sceneApprovalModal.action === 'reject' &&
                'Rejecting blocks image generation for all shots in this scene.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {sceneApprovalModal.action === 'accept' ? 'Approval Notes (Optional)' : 'Reviewer Feedback Notes (Required)'}
              </label>
              <textarea
                rows={3}
                value={sceneReviewNotes}
                onChange={(e) => setSceneReviewNotes(e.target.value)}
                placeholder={
                  sceneApprovalModal.action === 'accept'
                    ? 'e.g. Visual environment and shot framing approved...'
                    : 'e.g. Adjust camera angles in Shot 2, change background lighting...'
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSceneApprovalModal(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSceneApproval}
                type="button"
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow ${
                  sceneApprovalModal.action === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : sceneApprovalModal.action === 'revise'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {sceneApprovalModal.action === 'accept' && 'Confirm Approval'}
                {sceneApprovalModal.action === 'revise' && 'Submit Revision'}
                {sceneApprovalModal.action === 'reject' && 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Scene Approval History Audit Log */}
      {showSceneHistoryModal && currentScene && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Scene {currentScene.sceneNumber} Approval History
                </h3>
              </div>
              <button
                onClick={() => setShowSceneHistoryModal(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!currentScene.approval?.history || currentScene.approval.history.length === 0) ? (
                <p className="text-xs text-slate-500 text-center py-6">No historical records yet for this scene.</p>
              ) : (
                currentScene.approval.history
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <ApprovalBadge status={item.status} className="text-[10px] py-0" />
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans mt-1">"{item.reviewerNotes || 'No notes'}"</p>
                      <div className="text-[10px] text-slate-500 font-mono">Actor: {item.actor || 'human_reviewer'}</div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowSceneHistoryModal(false)}
                type="button"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Shot Full Specifications */}
      {editingShot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Edit Shot Specifications: {editingShot.shotCode}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure camera directions, prompts, character assignments, and runtime
                </p>
              </div>
              <button
                onClick={() => setEditingShot(null)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Shot Framing Type</label>
                  <select
                    aria-label="Shot Framing Type"
                    value={editingShot.shotType}
                    onChange={(e) =>
                      setEditingShot({ ...editingShot, shotType: e.target.value as ShotType })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Extreme Wide Shot (EWS)">Extreme Wide Shot (EWS)</option>
                    <option value="Wide Shot (WS)">Wide Shot (WS)</option>
                    <option value="Medium Shot (MS)">Medium Shot (MS)</option>
                    <option value="Close-up (CU)">Close-up (CU)</option>
                    <option value="Macro Extreme Close-up (ECU)">
                      Macro Extreme Close-up (ECU)
                    </option>
                    <option value="Tracking Camera">Tracking Camera</option>
                    <option value="Dolly Zoom">Dolly Zoom</option>
                    <option value="Point of View (POV)">Point of View (POV)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Camera Instruction</label>
                  <input
                    type="text"
                    value={editingShot.cameraInstruction}
                    onChange={(e) =>
                      setEditingShot({ ...editingShot, cameraInstruction: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Dutch angle push in..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Estimated Runtime (Sec)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={editingShot.durationSec}
                    onChange={(e) =>
                      setEditingShot({ ...editingShot, durationSec: parseInt(e.target.value) || 4 })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Character Multi-select */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">
                  Cast Members in this Shot
                </label>
                <div className="flex flex-wrap gap-2">
                  {project.characters.map((c) => {
                    const isAssigned = editingShot.characterIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const updated = isAssigned
                            ? editingShot.characterIds.filter((id) => id !== c.id)
                            : [...editingShot.characterIds, c.id];
                          setEditingShot({ ...editingShot, characterIds: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                          isAssigned
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.colorBadge }}
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Visual Shot Action</label>
                <textarea
                  rows={3}
                  value={editingShot.description}
                  onChange={(e) => setEditingShot({ ...editingShot, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Image Prompt */}
              <div className="space-y-1">
                <label className="text-xs text-amber-400 font-semibold">
                  AI Image Generation Prompt (FLUX / Midjourney)
                </label>
                <textarea
                  rows={3}
                  value={editingShot.imagePrompt}
                  onChange={(e) => setEditingShot({ ...editingShot, imagePrompt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Video Prompt */}
              <div className="space-y-1">
                <label className="text-xs text-cyan-400 font-semibold">
                  AI Video Generation Prompt (Runway / Luma / Kling / Pika)
                </label>
                <textarea
                  rows={3}
                  value={editingShot.videoPrompt}
                  onChange={(e) => setEditingShot({ ...editingShot, videoPrompt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingShot(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateShot(editingShot)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow"
              >
                Save Shot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
