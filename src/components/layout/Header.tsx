import React from 'react';
import { Film, Plus, ChevronDown, Sparkles, FolderArchive } from 'lucide-react';
import type { Project } from '../../types';

interface HeaderProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenAISettings: () => void;
  onExportCurrentProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenAISettings,
  onExportCurrentProject,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-400 p-[1.5px] shadow-lg shadow-rose-950/40">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 bg-clip-text text-transparent">
                HEALTH VIDEO STUDIO
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                PROD v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Educational Organ Character Animation</p>
          </div>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative ml-4 pl-4 border-l border-slate-800 hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">PROJECT:</span>
            <div className="relative group">
              <select
                aria-label="Active Project"
                value={currentProject?.id || ''}
                onChange={(e) => onSelectProject(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.scenes.reduce((acc, s) => acc + s.shots.length, 0)} shots)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenAISettings}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          title="Configure AI & Script Engine"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">AI Engines</span>
        </button>

        <button
          onClick={onExportCurrentProject}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          title="Export Project JSON"
        >
          <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Quick JSON</span>
        </button>

        <button
          onClick={onOpenNewProjectModal}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-amber-950/30 transition transform active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>
    </header>
  );
};
