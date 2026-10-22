import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  BookOpen,
  Wand2,
  ListOrdered,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import type { Project, Scene, Shot, ShotDialogue, ApprovalStatus } from '../../types';
import { STORY_TEMPLATES, buildProjectFromTemplate, generateCustomStory } from '../../data/storyTemplates';
import { ApprovalBadge } from '../common/StatusBadge';
import { createApprovalRecord, flagDependentAssetsForReview } from '../../services/stageGating';
import type { StudioTab } from '../layout/Sidebar';

interface ScriptStudioProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  project,
  onUpdateProject,
  onNavigateTab,
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('caffeine-rush');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'screenplay' | 'shots'>('screenplay');
  const [activeSceneId, setActiveSceneId] = useState<string>(project.scenes[0]?.id || '');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Approval modal states
  const [approvalModalAction, setApprovalModalAction] = useState<'accept' | 'reject' | 'revise' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modificationWarning, setModificationWarning] = useState<string | null>(null);

  const scriptApproval = project.scriptApproval || {
    status: 'draft' as ApprovalStatus,
    history: [],
  };

  // Helper to trigger modification cascade if approved script is altered
  const notifyScriptEdited = (updatedProject: Project, reason: string): Project => {
    if (scriptApproval.status === 'approved') {
      const flagged = flagDependentAssetsForReview(updatedProject, 'script', undefined, reason);
      setModificationWarning('Approved script was modified. Downstream scenes and shots have been flagged for re-review.');
      setTimeout(() => setModificationWarning(null), 5000);
      return flagged;
    }
    return updatedProject;
  };

  // Handle Script Approval Actions
  const handleConfirmApprovalAction = () => {
    if (!approvalModalAction) return;

    const timestamp = new Date().toISOString();
    let newStatus: ApprovalStatus = 'approved';
    let defaultNote = '';

    if (approvalModalAction === 'accept') {
      newStatus = 'approved';
      defaultNote = approvalNotes.trim() || 'Health script & organ dialogue approved for scene planning.';
    } else if (approvalModalAction === 'reject') {
      newStatus = 'rejected';
      defaultNote = approvalNotes.trim() || 'Script rejected by director.';
    } else if (approvalModalAction === 'revise') {
      newStatus = 'needs_revision';
      defaultNote = approvalNotes.trim() || 'Revision requested on organ dialogue / scenes.';
    }

    const historyRecord = createApprovalRecord(
      newStatus,
      defaultNote,
      scriptApproval.status,
      'human_reviewer'
    );

    let updatedProject: Project = {
      ...project,
      status: newStatus === 'approved' ? 'Storyboarding' : project.status,
      scriptApproval: {
        status: newStatus,
        history: [...scriptApproval.history, historyRecord],
        notes: defaultNote,
        lastReviewedAt: timestamp,
      },
    };

    if (newStatus === 'needs_revision') {
      updatedProject = flagDependentAssetsForReview(updatedProject, 'script', undefined, defaultNote);
    }

    onUpdateProject(updatedProject);
    setApprovalModalAction(null);
    setApprovalNotes('');
  };

  // Generate from Template Preset
  const handleLoadTemplate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = buildProjectFromTemplate(selectedTemplateId, project.id, project.characters);
      const updated: Project = {
        ...project,
        title: generated.title,
        topic: generated.topic,
        summary: generated.summary,
        scenes: generated.scenes,
        scriptApproval: {
          status: 'draft',
          history: [createApprovalRecord('draft', 'Generated new storyline from preset', undefined, 'system')],
          notes: 'Freshly generated from template',
          lastReviewedAt: new Date().toISOString(),
        },
        settings: {
          ...project.settings,
          targetAudience: generated.targetAudience,
          visualStyle: generated.visualStyle,
        },
      };

      onUpdateProject(updated);
      setIsGenerating(false);
      setShowGenerateModal(false);
      if (generated.scenes.length > 0) {
        setActiveSceneId(generated.scenes[0].id);
      }
    }, 600);
  };

  // Generate from Custom Topic
  const handleGenerateCustom = () => {
    if (!topicInput.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateCustomStory(
        topicInput.trim(),
        project.id,
        project.characters,
        project.settings.targetAudience,
        project.settings.visualStyle
      );
      const updated: Project = {
        ...project,
        title: generated.title,
        topic: topicInput.trim(),
        summary: generated.summary,
        scenes: generated.scenes,
        scriptApproval: {
          status: 'draft',
          history: [createApprovalRecord('draft', `Generated from custom topic: ${topicInput.trim()}`, undefined, 'system')],
          notes: 'Freshly generated from custom topic',
          lastReviewedAt: new Date().toISOString(),
        },
      };

      onUpdateProject(updated);
      setIsGenerating(false);
      setShowGenerateModal(false);
      if (generated.scenes.length > 0) {
        setActiveSceneId(generated.scenes[0].id);
      }
    }, 800);
  };

  // Update Scene details
  const handleUpdateScene = (sceneId: string, updates: Partial<Scene>) => {
    const updatedScenes = project.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s));
    const baseProject = { ...project, scenes: updatedScenes };
    const finalized = notifyScriptEdited(baseProject, 'Scene setting or narrative description modified');
    onUpdateProject(finalized);
  };

  // Add new Scene
  const handleAddScene = () => {
    const newSceneNumber = project.scenes.length + 1;
    const newSceneId = `scene-${project.id}-${Date.now()}`;
    const newShotId = `shot-${newSceneId}-1`;
    const newShot: Shot = {
      id: newShotId,
      sceneId: newSceneId,
      order: 1,
      shotCode: `SC0${newSceneNumber}-SH01`,
      shotType: 'Wide Shot (WS)',
      cameraInstruction: 'Static camera establishing the internal environment',
      description: 'The organs assemble to review the latest physiological event.',
      characterIds: [project.characters[0]?.id || ''].filter(Boolean),
      dialogues: [
        {
          id: `dlg-${newShotId}-1`,
          characterId: project.characters[0]?.id || '',
          characterName: project.characters[0]?.name || 'Dr. Synapse',
          line: 'Welcome everyone. We have an important bodily briefing today.',
          durationSec: 4,
          approvalStatus: 'draft',
          approvalHistory: [],
        },
      ],
      imagePrompt: '3D Pixar style scene inside human body, expressive organ characters in scientific chamber',
      videoPrompt: 'Smooth camera dolly in showing animated organ character speaking with enthusiasm',
      approvalStatus: 'draft',
      approvalHistory: [],
      imageGenerationMode: 'single',
      imageCandidates: [],
      videoCandidates: [],
      status: 'planned',
      soundEffects: [],
      durationSec: 5,
    };

    const newScene: Scene = {
      id: newSceneId,
      projectId: project.id,
      order: newSceneNumber,
      sceneNumber: newSceneNumber,
      title: `Scene ${newSceneNumber}: New Bodily Phase`,
      environment: 'Internal Vascular Highway',
      description: 'Description of what occurs during this phase.',
      approval: {
        status: 'draft',
        history: [],
      },
      shots: [newShot],
    };

    const baseProject = { ...project, scenes: [...project.scenes, newScene] };
    const finalized = notifyScriptEdited(baseProject, 'New scene added to script');
    onUpdateProject(finalized);
    setActiveSceneId(newSceneId);
  };

  // Delete Scene
  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) {
      alert('A project must have at least one scene.');
      return;
    }
    const updatedScenes = project.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, idx) => ({ ...s, order: idx + 1, sceneNumber: idx + 1 }));
    const baseProject = { ...project, scenes: updatedScenes };
    const finalized = notifyScriptEdited(baseProject, 'Scene removed from script');
    onUpdateProject(finalized);
    if (activeSceneId === sceneId) {
      setActiveSceneId(updatedScenes[0]?.id || '');
    }
  };

  // Add Dialogue to a Shot
  const handleAddDialogue = (shotId: string, sceneId: string) => {
    const defaultChar = project.characters[0];
    const newDlg: ShotDialogue = {
      id: `dlg-${shotId}-${Date.now()}`,
      characterId: defaultChar?.id || '',
      characterName: defaultChar?.name || 'Character',
      line: 'Enter new dialogue line here...',
      durationSec: 4,
      approvalStatus: 'draft',
      approvalHistory: [],
    };

    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        shots: scene.shots.map((shot) => {
          if (shot.id !== shotId) return shot;
          return {
            ...shot,
            dialogues: [...shot.dialogues, newDlg],
          };
        }),
      };
    });

    const baseProject = { ...project, scenes: updatedScenes };
    const finalized = notifyScriptEdited(baseProject, 'New dialogue line added to script');
    onUpdateProject(finalized);
  };

  // Update a Dialogue line
  const handleUpdateDialogue = (
    sceneId: string,
    shotId: string,
    dlgId: string,
    updates: Partial<ShotDialogue>
  ) => {
    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        shots: scene.shots.map((shot) => {
          if (shot.id !== shotId) return shot;
          return {
            ...shot,
            dialogues: shot.dialogues.map((dlg) => {
              if (dlg.id !== dlgId) return dlg;
              return { ...dlg, ...updates };
            }),
          };
        }),
      };
    });

    const baseProject = { ...project, scenes: updatedScenes };
    const finalized = notifyScriptEdited(baseProject, 'Dialogue line revised');
    onUpdateProject(finalized);
  };

  // Delete Dialogue
  const handleDeleteDialogue = (sceneId: string, shotId: string, dlgId: string) => {
    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        shots: scene.shots.map((shot) => {
          if (shot.id !== shotId) return shot;
          return {
            ...shot,
            dialogues: shot.dialogues.filter((dlg) => dlg.id !== dlgId),
          };
        }),
      };
    });

    const baseProject = { ...project, scenes: updatedScenes };
    const finalized = notifyScriptEdited(baseProject, 'Dialogue line deleted from script');
    onUpdateProject(finalized);
  };

  const currentScene = project.scenes.find((s) => s.id === activeSceneId) || project.scenes[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Modification Invalidation Toast Banner */}
      {modificationWarning && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-3 animate-slideDown shadow-lg">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <span className="font-bold block">Approval Revision Cascade Triggered:</span>
            <span>{modificationWarning}</span>
          </div>
        </div>
      )}

      {/* SCRIPT APPROVAL CONTROL CONSOLE */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
                STAGE 1 APPROVAL GATE
              </span>
              <span className="text-slate-600">•</span>
              <ApprovalBadge status={scriptApproval.status} labelPrefix="Script" />
            </div>
            <h2 className="text-lg font-black text-slate-100">
              Creative Script Approval & Editorial Sign-off
            </h2>
            <p className="text-xs text-slate-400">
              {scriptApproval.status === 'approved'
                ? 'Script is approved. Downstream Scene Planning and Shot Breakdown are unlocked.'
                : 'Scene planning and image generation remain locked until the screenplay receives director approval.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* History button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="View approval decision history"
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({scriptApproval.history.length})</span>
            </button>

            {/* Accept / Reject / Revise Controls */}
            {scriptApproval.status !== 'approved' ? (
              <>
                <button
                  onClick={() => setApprovalModalAction('accept')}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept Script</span>
                </button>

                <button
                  onClick={() => setApprovalModalAction('revise')}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Request Revision</span>
                </button>

                <button
                  onClick={() => setApprovalModalAction('reject')}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setApprovalModalAction('revise')}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Revoke & Request Revision</span>
                </button>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('shots')}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md transition active:scale-95"
                  >
                    <span>Proceed to Scene Planning</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Feedback Note */}
        {scriptApproval.notes && (
          <div className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold mt-0.5">
              DIRECTOR REVIEW NOTE:
            </span>
            <span className="italic flex-1">"{scriptApproval.notes}"</span>
            {scriptApproval.lastReviewedAt && (
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(scriptApproval.lastReviewedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Screenplay Studio</h1>
          <p className="text-xs text-slate-400">
            Write, review, and refine educational dialogues for human organ characters
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setViewMode('screenplay')}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'screenplay'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Screenplay View</span>
            </button>
            <button
              onClick={() => setViewMode('shots')}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'shots'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Dialogue by Shot</span>
            </button>
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Regenerate Script</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Scenes List & Navigation */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              SCENES ({project.scenes.length})
            </span>
            <button
              onClick={handleAddScene}
              type="button"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1 px-2 border border-slate-700"
              title="Add New Scene"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Scene</span>
            </button>
          </div>

          <div className="space-y-2">
            {project.scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setActiveSceneId(scene.id)}
                type="button"
                className={`w-full text-left p-3 rounded-xl border transition group ${
                  activeSceneId === scene.id
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    SCENE {scene.sceneNumber}
                  </span>
                  <ApprovalBadge status={scene.approval?.status || 'draft'} className="text-[10px] py-0" />
                </div>
                <div className="text-xs font-bold text-slate-100 line-clamp-1">{scene.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{scene.environment}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Active Scene Script Editor */}
        <div className="lg:col-span-3 space-y-6">
          {currentScene ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Scene Metadata Header */}
              <div className="space-y-3 border-b border-slate-800/80 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
                      SCENE {currentScene.sceneNumber}
                    </span>
                    <input
                      type="text"
                      value={currentScene.title}
                      onChange={(e) => handleUpdateScene(currentScene.id, { title: e.target.value })}
                      className="bg-transparent text-lg font-bold text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none transition px-1"
                      placeholder="Scene Title..."
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteScene(currentScene.id)}
                    type="button"
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto"
                    title="Delete Scene"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Scene</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">ENVIRONMENT / SETTING</label>
                    <input
                      type="text"
                      value={currentScene.environment}
                      onChange={(e) => handleUpdateScene(currentScene.id, { environment: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                      placeholder="e.g. Gastric Cavern, Arterial Highway, Lung Alveoli..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-mono">SCENE NARRATIVE GOAL</label>
                    <input
                      type="text"
                      value={currentScene.description}
                      onChange={(e) => handleUpdateScene(currentScene.id, { description: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                      placeholder="What happens in this scene biologically..."
                    />
                  </div>
                </div>
              </div>

              {/* View 1: Screenplay Mode (Classic Script view) */}
              {viewMode === 'screenplay' ? (
                <div className="space-y-6 bg-slate-950/90 rounded-xl p-6 border border-slate-800 font-mono text-xs shadow-inner">
                  <div className="text-center pb-3 border-b border-slate-800">
                    <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                      EXT. {currentScene.environment.toUpperCase()} - CONTINUOUS
                    </span>
                    <p className="text-slate-400 text-[11px] mt-1 font-sans italic">
                      {currentScene.description}
                    </p>
                  </div>

                  {currentScene.shots.map((shot) => (
                    <div key={shot.id} className="space-y-4 pt-2 pb-4 border-b border-slate-800/60 last:border-0">
                      {/* Shot Heading */}
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-slate-300">
                          {shot.shotCode} — {shot.shotType.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500">{shot.cameraInstruction}</span>
                      </div>

                      {/* Shot Action line */}
                      <p className="text-slate-300 font-sans leading-relaxed pl-4 border-l-2 border-slate-700">
                        {shot.description}
                      </p>

                      {/* Dialogues */}
                      <div className="space-y-3 pt-2">
                        {shot.dialogues.map((dlg) => {
                          const char = project.characters.find((c) => c.id === dlg.characterId);
                          return (
                            <div key={dlg.id} className="max-w-md mx-auto text-center space-y-1">
                              <span
                                className="font-bold uppercase tracking-wider text-[11px]"
                                style={{ color: char?.colorBadge || '#f59e0b' }}
                              >
                                {dlg.characterName}
                              </span>
                              {dlg.audioPrompt && (
                                <span className="block text-[10px] text-slate-500 italic">
                                  ({dlg.audioPrompt})
                                </span>
                              )}
                              <p className="text-slate-100 font-sans text-sm bg-slate-900/60 py-2 px-4 rounded-lg border border-slate-800/80 shadow-sm">
                                "{dlg.line}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* View 2: Shots & Dialogue Editor */
                <div className="space-y-6">
                  {currentScene.shots.map((shot) => (
                    <div
                      key={shot.id}
                      className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            {shot.shotCode}
                          </span>
                          <span className="text-xs text-slate-400">{shot.shotType}</span>
                        </div>
                        <button
                          onClick={() => handleAddDialogue(shot.id, currentScene.id)}
                          type="button"
                          className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Line</span>
                        </button>
                      </div>

                      {/* Shot Description */}
                      <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Visual Action
                        </span>
                        {shot.description}
                      </div>

                      {/* Dialogue lines editor */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Character Dialogue Lines ({shot.dialogues.length})</span>
                        </span>

                        {shot.dialogues.length === 0 ? (
                          <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                            No dialogue assigned to this shot yet. Click "Add Line" above.
                          </div>
                        ) : (
                          shot.dialogues.map((dlg) => (
                            <div
                              key={dlg.id}
                              className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                {/* Character Picker */}
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] text-slate-500 font-mono">SPEAKER:</label>
                                  <select
                                    aria-label="Character Speaker"
                                    value={dlg.characterId}
                                    onChange={(e) => {
                                      const selected = project.characters.find((c) => c.id === e.target.value);
                                      handleUpdateDialogue(currentScene.id, shot.id, dlg.id, {
                                        characterId: e.target.value,
                                        characterName: selected ? selected.name : 'Unknown',
                                      });
                                    }}
                                    className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
                                  >
                                    {project.characters.map((char) => (
                                      <option key={char.id} value={char.id}>
                                        {char.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <button
                                  onClick={() => handleDeleteDialogue(currentScene.id, shot.id, dlg.id)}
                                  type="button"
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                  title="Delete Line"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Dialogue Speech Input */}
                              <div>
                                <textarea
                                  aria-label="Dialogue Line"
                                  rows={2}
                                  value={dlg.line}
                                  onChange={(e) =>
                                    handleUpdateDialogue(currentScene.id, shot.id, dlg.id, {
                                      line: e.target.value,
                                    })
                                  }
                                  placeholder="Enter dialogue line spoken by this character..."
                                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none font-sans"
                                />
                              </div>

                              {/* Voice delivery note */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">VOICE TONE:</span>
                                <input
                                  type="text"
                                  value={dlg.audioPrompt || ''}
                                  onChange={(e) =>
                                    handleUpdateDialogue(currentScene.id, shot.id, dlg.id, {
                                      audioPrompt: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. breathless excitement, sarcastic remark, whispered warning..."
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              No scenes created. Click "Add Scene" to start your script.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Confirm Approval / Reject / Revise Action */}
      {approvalModalAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {approvalModalAction === 'accept' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {approvalModalAction === 'revise' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {approvalModalAction === 'reject' && <XCircle className="w-5 h-5 text-rose-400" />}
                <h3 className="text-base font-bold text-slate-100">
                  {approvalModalAction === 'accept' && 'Accept & Approve Health Script'}
                  {approvalModalAction === 'revise' && 'Request Script Revisions'}
                  {approvalModalAction === 'reject' && 'Reject Script'}
                </h3>
              </div>
              <button
                onClick={() => setApprovalModalAction(null)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {approvalModalAction === 'accept' &&
                'Approving this script unlocks Stage 2: Scene & Shot Planning. Future changes to approved dialogue will flag downstream scenes for re-review.'}
              {approvalModalAction === 'revise' &&
                'Requesting revision returns the script to needs_revision status and cascades review flags to all dependent scenes.'}
              {approvalModalAction === 'reject' &&
                'Rejecting will mark the script rejected and halt downstream asset generation until a revised script is submitted.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {approvalModalAction === 'accept' ? 'Approval Sign-off Note (Optional)' : 'Reviewer Feedback Notes (Required)'}
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={
                  approvalModalAction === 'accept'
                    ? 'e.g. Dialogue pacing looks excellent, approved for scene staging...'
                    : 'e.g. Tone down the caffeine Panic scene, make Brain explanation clearer for general audience...'
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setApprovalModalAction(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprovalAction}
                type="button"
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow ${
                  approvalModalAction === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : approvalModalAction === 'revise'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {approvalModalAction === 'accept' && 'Confirm Approval'}
                {approvalModalAction === 'revise' && 'Submit Revision Request'}
                {approvalModalAction === 'reject' && 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Approval History Audit Log */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Script Approval Audit Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {scriptApproval.history.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No historical records yet.</p>
              ) : (
                scriptApproval.history
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
                onClick={() => setShowHistoryModal(false)}
                type="button"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generator Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Health Story & Dialogue Generator</h3>
                  <p className="text-xs text-slate-400">Generate an educational organ-cast storyline</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                type="button"
                className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Option A: Preset Template */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Option 1: Pick a Tested Educational Health Narrative
              </label>
              <div className="space-y-2">
                {STORY_TEMPLATES.map((tpl) => (
                  <label
                    key={tpl.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedTemplateId === tpl.id
                        ? 'bg-amber-500/10 border-amber-500/40 text-slate-200'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="story-template"
                      value={tpl.id}
                      checked={selectedTemplateId === tpl.id}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="mt-1 text-amber-500 focus:ring-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{tpl.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{tpl.summary}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={handleLoadTemplate}
                disabled={isGenerating}
                type="button"
                className="w-full mt-2 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow transition flex items-center justify-center gap-2"
              >
                {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                <span>Load Selected Story & Organ Dialogue</span>
              </button>
            </div>

            {/* Option B: Custom Topic */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                Option 2: Generate from Custom Health Topic
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Sugar rush and Insulin, Sleep deprivation, High Altitude breathing..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleGenerateCustom}
                  disabled={isGenerating || !topicInput.trim()}
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 transition flex items-center gap-1.5"
                >
                  {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  <span>Generate</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Automatically builds scenes, character dialogs for Brain, Heart, Lungs, Stomach, Liver, and Kidneys.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
