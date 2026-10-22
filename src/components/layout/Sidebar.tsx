import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Clapperboard,
  Camera,
  Mic,
  Video,
  Film,
  Download,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import type { Project } from '../../types';

export type StudioTab =
  | 'gemini_assistant'
  | 'dashboard'
  | 'script'
  | 'characters'
  | 'shots'
  | 'images'
  | 'video'
  | 'audio'
  | 'final_edit'
  | 'export';

interface SidebarProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  project: Project | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, project }) => {
  const totalShots = project?.scenes.reduce((acc, s) => acc + s.shots.length, 0) || 0;
  const approvedShots =
    project?.scenes.reduce((acc, s) => acc + s.shots.filter((sh) => sh.approvalStatus === 'approved').length, 0) || 0;
  const approvedImageShots =
    project?.scenes.reduce(
      (acc, s) =>
        acc +
        s.shots.filter((sh) => sh.approvedImageId || sh.imageCandidates?.some((c) => c.isApprovedReference)).length,
      0
    ) || 0;
  const approvedVideoShots =
    project?.scenes.reduce(
      (acc, s) =>
        acc +
        s.shots.filter((sh) => sh.approvedVideoId || sh.videoCandidates?.some((c) => c.isApprovedTake)).length,
      0
    ) || 0;

  const characterCount = project?.characters.length || 0;
  const scenesCount = project?.scenes.length || 0;
  const approvedScenesCount = project?.scenes.filter((s) => s.approval?.status === 'approved').length || 0;

  const scriptApprovalStatus = project?.scriptApproval?.status || 'draft';
  const isScriptApproved = scriptApprovalStatus === 'approved';
  const hasApprovedScene = approvedScenesCount > 0;

  const navItems = [
    {
      id: 'gemini_assistant' as StudioTab,
      label: 'Gemini Web Studio',
      icon: Sparkles,
      badge: '4-Step Workflow',
      highlight: true,
    },
    {
      id: 'dashboard' as StudioTab,
      label: 'Project Dashboard',
      icon: LayoutDashboard,
      badge: `${scenesCount} scenes`,
    },
    {
      id: 'script' as StudioTab,
      label: 'Story & Script Studio',
      icon: FileText,
      badge:
        scriptApprovalStatus === 'approved'
          ? '✓ Approved'
          : scriptApprovalStatus === 'needs_revision'
          ? '⚠ Revise'
          : 'Draft',
      statusType: scriptApprovalStatus,
    },
    {
      id: 'characters' as StudioTab,
      label: 'Character Manager',
      icon: Users,
      badge: `${characterCount} Organs`,
    },
    {
      id: 'shots' as StudioTab,
      label: 'Scene & Shot Manager',
      icon: Clapperboard,
      badge: !isScriptApproved ? '🔒 Script Gate' : `${approvedScenesCount}/${scenesCount} approved`,
      isLocked: !isScriptApproved,
    },
    {
      id: 'images' as StudioTab,
      label: 'Image Studio (Mode A/B)',
      icon: Camera,
      badge: !hasApprovedScene
        ? '🔒 Scene Gate'
        : `${approvedImageShots}/${totalShots} frames`,
      isLocked: !hasApprovedScene,
      highlight: approvedImageShots === totalShots && totalShots > 0,
    },
    {
      id: 'video' as StudioTab,
      label: 'Video Manager',
      icon: Video,
      badge:
        approvedImageShots === 0
          ? '🔒 Need Frames'
          : `${approvedVideoShots}/${totalShots} takes`,
      isLocked: approvedImageShots === 0,
      highlight: approvedVideoShots === totalShots && totalShots > 0,
    },
    {
      id: 'audio' as StudioTab,
      label: 'Audio Studio',
      icon: Mic,
      badge: 'Voice & BGM',
    },
    {
      id: 'final_edit' as StudioTab,
      label: 'Final Edit Timeline',
      icon: Film,
      badge:
        project?.finalEditApproval?.status === 'approved'
          ? '✓ Approved'
          : approvedVideoShots > 0
          ? 'Ready to Edit'
          : 'Pending Clips',
    },
    {
      id: 'export' as StudioTab,
      label: 'Export & Files',
      icon: Download,
      badge: 'Zip / JSON',
    },
  ];

  const completionPct = totalShots > 0 ? Math.round((approvedShots / totalShots) * 100) : 0;

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4">
        {/* Project Mini summary card */}
        {project && (
          <div className="mx-3.5 mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase text-slate-400">ACTIVE PROJECT</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {project.status}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-200 line-clamp-1 mb-2" title={project.title}>
              {project.title}
            </h3>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Production Approval</span>
                <span className="text-amber-400 font-bold">{completionPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1 px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      item.isLocked
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : item.statusType === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : item.statusType === 'needs_revision'
                        ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                        : isActive
                        ? 'bg-amber-400/20 text-amber-200'
                        : 'bg-slate-900 text-slate-500 group-hover:text-slate-400 border border-slate-800'
                    }`}
                  >
                    {item.isLocked && <Lock className="w-2.5 h-2.5" />}
                    <span>{item.badge}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 m-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Stage Gate Enforced</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Human director sign-off required at each production milestone before asset generation.
        </p>
      </div>
    </aside>
  );
};
