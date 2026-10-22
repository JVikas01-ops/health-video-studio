import React, { useState } from 'react';
import {
  Clapperboard,
  Clock,
  Users,
  Copy,
  Trash2,
  Settings2,
  Film,
  Layers,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import type { Project, TargetAudience, VisualStyle, ProjectStatus } from '../../types';
import { StatusBadge, ApprovalBadge } from '../common/StatusBadge';
import type { StudioTab } from '../layout/Sidebar';

interface ProjectDashboardProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onDuplicateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigateTab: (tab: StudioTab) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onUpdateProject,
  onDuplicateProject,
  onDeleteProject,
  onNavigateTab,
}) => {
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // Stats calculation
  const totalScenes = project.scenes.length;
  const allShots = project.scenes.flatMap((s) => s.shots);
  const totalShots = allShots.length;
  const approvedShots = allShots.filter((sh) => sh.status === 'approved').length;
  const generatedShots = allShots.filter((sh) => sh.status === 'generated').length;
  const inProgressShots = allShots.filter((sh) => sh.status === 'in_progress').length;
  const plannedShots = allShots.filter((sh) => sh.status === 'planned').length;
  const totalDurationSec = allShots.reduce((acc, sh) => acc + (sh.durationSec || 4), 0);
  const durationMin = (totalDurationSec / 60).toFixed(1);

  const completionPct = totalShots > 0 ? Math.round((approvedShots / totalShots) * 100) : 0;

  const handleStatusChange = (status: ProjectStatus) => {
    onUpdateProject({ ...project, status });
  };

  const handleAudienceChange = (targetAudience: TargetAudience) => {
    onUpdateProject({
      ...project,
      settings: { ...project.settings, targetAudience },
    });
  };

  const handleStyleChange = (visualStyle: VisualStyle) => {
    onUpdateProject({
      ...project,
      settings: { ...project.settings, visualStyle },
    });
  };

  const handleAspectRatioChange = (aspectRatio: '16:9' | '9:16' | '1:1') => {
    onUpdateProject({
      ...project,
      settings: { ...project.settings, aspectRatio },
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner & Hero */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {project.settings.visualStyle}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {project.settings.targetAudience}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                {project.settings.aspectRatio} • {project.settings.resolution}
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-100 tracking-tight leading-tight">
              {project.title}
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed">{project.summary}</p>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-1">
              <span>Topic: <strong className="text-slate-300 font-semibold">{project.topic}</strong></span>
              <span>•</span>
              <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onDuplicateProject(project)}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Project</span>
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete project "${project.title}"?`)) {
                  onDeleteProject(project.id);
                }
              }}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gemini Website 4-Step Studio Fast Track */}
      <div className="relative rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-amber-950/30 border border-cyan-500/30 p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-400 p-0.5 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Gemini Web Automation Assistant (4-Step Creative Studio)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                ZERO API KEYS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Generate Story Concept ➔ 30–40s Script & Dialogue ➔ Scene Images ➔ Gemini Video in your signed-in browser session.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('gemini_assistant')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <span>Launch Gemini Assistant</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Production Approval Milestones Pipeline */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              CREATIVE APPROVAL GATES
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Stage 1 through Stage 5</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Gate 1: Script */}
          <div
            onClick={() => onNavigateTab('script')}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">1. Script</span>
              <ApprovalBadge status={project.scriptApproval?.status || 'draft'} className="text-[9px] py-0 px-1.5" />
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">Screenplay & Dialogue</div>
            <div className="text-[10px] text-slate-400">
              {project.scriptApproval?.status === 'approved' ? '✓ Unlocks Scene Staging' : '🔒 Scene Planning Locked'}
            </div>
          </div>

          {/* Gate 2: Scenes */}
          <div
            onClick={() => onNavigateTab('shots')}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">2. Scenes</span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                {project.scenes.filter((s) => s.approval?.status === 'approved').length}/{project.scenes.length}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">Scene & Shot Staging</div>
            <div className="text-[10px] text-slate-400">
              {project.scenes.every((s) => s.approval?.status === 'approved') ? '✓ All Scenes Approved' : 'Review & Approve Scenes'}
            </div>
          </div>

          {/* Gate 3: Images */}
          <div
            onClick={() => onNavigateTab('images')}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">3. Images</span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                {allShots.filter((sh) => sh.approvedImageId || sh.approvalStatus === 'approved').length}/{totalShots}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">Visual Reference Frames</div>
            <div className="text-[10px] text-slate-400">Mode A / Mode B variations</div>
          </div>

          {/* Gate 4: Videos */}
          <div
            onClick={() => onNavigateTab('video')}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">4. Videos</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                {allShots.filter((sh) => sh.approvedVideoId || (sh.attachedVideoUrl && sh.approvalStatus === 'approved')).length}/{totalShots}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">Shot Video Takes</div>
            <div className="text-[10px] text-slate-400">Independent takes (no auto-merge)</div>
          </div>

          {/* Gate 5: Final Edit */}
          <div
            onClick={() => onNavigateTab('final_edit')}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">5. Final Edit</span>
              <ApprovalBadge status={project.finalEditApproval?.status || 'draft'} className="text-[9px] py-0 px-1.5" />
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">Timeline & Preview</div>
            <div className="text-[10px] text-slate-400">Director final sign-off</div>
          </div>
        </div>
      </div>

      {/* Production Progress Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Runtime</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-100">{durationMin}</span>
            <span className="text-xs text-slate-500 font-mono">minutes ({totalDurationSec}s)</span>
          </div>
          <p className="text-[11px] text-slate-500">Across {totalScenes} scenes</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Production Status</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{completionPct}%</span>
            <span className="text-xs text-slate-500 font-mono">approved</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Shots</span>
            <Clapperboard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-100">{totalShots}</span>
            <span className="text-xs text-slate-500 font-mono">shots planned</span>
          </div>
          <p className="text-[11px] text-slate-500">{approvedShots} approved, {generatedShots} generated</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Organ Characters</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-100">{project.characters.length}</span>
            <span className="text-xs text-slate-500 font-mono">cast members</span>
          </div>
          <p className="text-[11px] text-slate-500">Brain, Heart, Lungs, Stomach, etc.</p>
        </div>
      </div>

      {/* Shot Pipeline Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              SHOT PIPELINE STATUS
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('shots')}
            type="button"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 group"
          >
            <span>Open Shot Timeline</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Planned</span>
              <span className="text-xs font-bold text-slate-300">{plannedShots}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full">
              <div
                className="h-full bg-slate-500 rounded-full"
                style={{ width: `${totalShots ? (plannedShots / totalShots) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-amber-400">In Progress</span>
              <span className="text-xs font-bold text-amber-300">{inProgressShots}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${totalShots ? (inProgressShots / totalShots) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-cyan-400">Generated</span>
              <span className="text-xs font-bold text-cyan-300">{generatedShots}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${totalShots ? (generatedShots / totalShots) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-emerald-400">Approved</span>
              <span className="text-xs font-bold text-emerald-300">{approvedShots}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${totalShots ? (approvedShots / totalShots) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Production Settings Accordion */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              PROJECT SETTINGS & PRODUCTION SPECIFICATIONS
            </h2>
          </div>
          <button
            onClick={() => setIsEditingSettings(!isEditingSettings)}
            type="button"
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
          >
            {isEditingSettings ? 'Close Settings' : 'Edit Specs'}
          </button>
        </div>

        {isEditingSettings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Production Status</label>
              <select
                aria-label="Production Status"
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Scripting">Scripting</option>
                <option value="Storyboarding">Storyboarding</option>
                <option value="Voice & Audio">Voice & Audio</option>
                <option value="Shot Production">Shot Production</option>
                <option value="Review & Approved">Review & Approved</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Target Audience</label>
              <select
                aria-label="Target Audience"
                value={project.settings.targetAudience}
                onChange={(e) => handleAudienceChange(e.target.value as TargetAudience)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Kids & Family">Kids & Family</option>
                <option value="Teens & Students">Teens & Students</option>
                <option value="General Public">General Public</option>
                <option value="Medical & Biology Enthusiasts">Medical & Biology Enthusiasts</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Visual Style</label>
              <select
                aria-label="Visual Style"
                value={project.settings.visualStyle}
                onChange={(e) => handleStyleChange(e.target.value as VisualStyle)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="3D Expressive Pixar Style">3D Expressive Pixar Style</option>
                <option value="2D Vibrant Comic Animation">2D Vibrant Comic Animation</option>
                <option value="Cyberpunk Sci-Fi Cellular">Cyberpunk Sci-Fi Cellular</option>
                <option value="Stylized Claymation Organics">Stylized Claymation Organics</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Aspect Ratio</label>
              <select
                aria-label="Aspect Ratio"
                value={project.settings.aspectRatio}
                onChange={(e) => handleAspectRatioChange(e.target.value as '16:9' | '9:16' | '1:1')}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="16:9">16:9 (Landscape YouTube / Broadcast)</option>
                <option value="9:16">9:16 (Vertical Shorts / TikTok / Reels)</option>
                <option value="1:1">1:1 (Square Feed)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Stage</span>
              <span className="font-semibold text-slate-200">{project.status}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Audience</span>
              <span className="font-semibold text-slate-200">{project.settings.targetAudience}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Style</span>
              <span className="font-semibold text-slate-200">{project.settings.visualStyle}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-slate-500 block mb-0.5">Format</span>
              <span className="font-semibold text-slate-200">
                {project.settings.aspectRatio} @ {project.settings.videoFps}fps
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scenes Breakdown Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              SCENES & SHOTS OVERVIEW ({project.scenes.length} Scenes)
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('script')}
            type="button"
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1 group"
          >
            <span>Edit Full Script</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="space-y-3">
          {project.scenes.map((scene) => {
            const sceneApproved = scene.shots.filter((sh) => sh.status === 'approved').length;
            const sceneDuration = scene.shots.reduce((acc, sh) => acc + (sh.durationSec || 4), 0);

            return (
              <div
                key={scene.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-amber-400">
                      {scene.sceneNumber}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{scene.title}</h3>
                      <p className="text-xs text-slate-400">{scene.environment}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>{scene.shots.length} shots</span>
                    <span>•</span>
                    <span>{sceneDuration}s</span>
                    <span>•</span>
                    <span className="text-emerald-400">{sceneApproved}/{scene.shots.length} approved</span>
                  </div>
                </div>

                {/* Shots preview chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {scene.shots.map((shot) => (
                    <div
                      key={shot.id}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-slate-300">
                          {shot.shotCode}
                        </span>
                        <StatusBadge status={shot.status} />
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {shot.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/50">
                        <span>{shot.shotType}</span>
                        <span>{shot.durationSec}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
