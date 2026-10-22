import { useState, useEffect } from 'react';
import type { Project } from './types';
import {
  loadAllProjects,
  saveProject,
  deleteProject,
  duplicateProject,
  exportProjectToJson,
} from './services/projectStorage';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { StudioTab } from './components/layout/Sidebar';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { ScriptStudio } from './components/script/ScriptStudio';
import { CharacterAssetManager } from './components/characters/CharacterAssetManager';
import { SceneShotManager } from './components/shots/SceneShotManager';
import { ImageGenerationStudio } from './components/images/ImageGenerationStudio';
import { AudioStudio } from './components/audio/AudioStudio';
import { VideoGenerationManager } from './components/video/VideoGenerationManager';
import { FinalEditStudio } from './components/edit/FinalEditStudio';
import { ExportFileManager } from './components/export/ExportFileManager';
import { GeminiWebAssistant } from './components/gemini/GeminiWebAssistant';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { AISettingsModal } from './components/modals/AISettingsModal';

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);

  // Load projects from IndexedDB on startup
  useEffect(() => {
    const init = async () => {
      try {
        const loaded = await loadAllProjects();
        setProjects(loaded);
        const lastActiveId = localStorage.getItem('hvs_active_project_id');
        if (lastActiveId && loaded.some((p) => p.id === lastActiveId)) {
          setActiveProjectId(lastActiveId);
        } else if (loaded.length > 0) {
          setActiveProjectId(loaded[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  // Handlers
  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem('hvs_active_project_id', id);
  };

  const handleUpdateProject = async (updated: Project) => {
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));
    setProjects(updatedProjects);
    await saveProject(updated);
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      const cloned = await duplicateProject(project);
      setProjects([cloned, ...projects]);
      setActiveProjectId(cloned.id);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to duplicate project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      const remaining = projects.filter((p) => p.id !== projectId);
      setProjects(remaining);
      if (remaining.length > 0) {
        setActiveProjectId(remaining[0].id);
      } else {
        // re-initialize if empty
        const fresh = await loadAllProjects();
        setProjects(fresh);
        setActiveProjectId(fresh[0]?.id || null);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleCreateProject = async (newProject: Project) => {
    await saveProject(newProject);
    setProjects([newProject, ...projects]);
    setActiveProjectId(newProject.id);
    setActiveTab('dashboard');
  };

  const handleProjectImported = (imported: Project) => {
    setProjects([imported, ...projects]);
    setActiveProjectId(imported.id);
    setActiveTab('dashboard');
  };

  const handleExportCurrent = () => {
    if (currentProject) {
      exportProjectToJson(currentProject);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-cyan-400 p-0.5 animate-spin">
          <div className="w-full h-full bg-slate-950 rounded-[14px]" />
        </div>
        <p className="text-xs text-slate-400 font-mono tracking-wider">
          INITIALIZING HEALTH VIDEO STUDIO STORAGE...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Studio Header */}
      <Header
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
        onOpenAISettings={() => setIsAISettingsOpen(true)}
        onExportCurrentProject={handleExportCurrent}
      />

      {/* Main Studio Workbench */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          project={currentProject}
        />

        {/* Studio Viewport Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950/40">
          {currentProject ? (
            <>
              {activeTab === 'gemini_assistant' && (
                <GeminiWebAssistant
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'dashboard' && (
                <ProjectDashboard
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onDuplicateProject={handleDuplicateProject}
                  onDeleteProject={handleDeleteProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'script' && (
                <ScriptStudio
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'characters' && (
                <CharacterAssetManager
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                />
              )}

              {activeTab === 'shots' && (
                <SceneShotManager
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'images' && (
                <ImageGenerationStudio
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'audio' && (
                <AudioStudio
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                />
              )}

              {activeTab === 'video' && (
                <VideoGenerationManager
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'final_edit' && (
                <FinalEditStudio
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'export' && (
                <ExportFileManager
                  project={currentProject}
                  onProjectImported={handleProjectImported}
                  onNavigateTab={setActiveTab}
                />
              )}
            </>
          ) : (
            <div className="p-16 text-center text-slate-500">
              No project active. Please click "New Project" in the header to create one.
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
      />
    </div>
  );
}

export default App;
