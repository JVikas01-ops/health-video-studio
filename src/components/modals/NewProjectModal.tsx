import React, { useState } from 'react';
import { Film, X } from 'lucide-react';
import type { Project, TargetAudience, VisualStyle } from '../../types';
import { getDefaultCharacters } from '../../data/defaultCharacters';
import { STORY_TEMPLATES, buildProjectFromTemplate, generateCustomStory } from '../../data/storyTemplates';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [topic, setTopic] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('caffeine-rush');
  const [useTemplate, setUseTemplate] = useState(true);
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('General Public');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('3D Expressive Pixar Style');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');

  if (!isOpen) return null;

  const handleCreate = () => {
    const newProjectId = `proj-${Date.now()}`;
    const defaultCharacters = getDefaultCharacters(newProjectId);

    let title = '';
    let summary = '';
    let scenes = [];

    if (useTemplate) {
      const templateData = buildProjectFromTemplate(selectedTemplateId, newProjectId, defaultCharacters);
      title = templateData.title;
      summary = templateData.summary;
      scenes = templateData.scenes;
    } else {
      const customTopic = topic.trim() || 'Hydration and Cellular Balance';
      const customData = generateCustomStory(
        customTopic,
        newProjectId,
        defaultCharacters,
        targetAudience,
        visualStyle
      );
      title = customData.title;
      summary = customData.summary;
      scenes = customData.scenes;
    }

    const newProject: Project = {
      id: newProjectId,
      title,
      topic: useTemplate ? STORY_TEMPLATES.find((t) => t.id === selectedTemplateId)?.topic || 'Caffeine' : topic.trim() || 'Health Science',
      summary,
      status: 'Scripting',
      scriptApproval: {
        status: 'draft',
        history: [],
      },
      finalEditApproval: {
        status: 'draft',
        history: [],
        arrangedShotIds: scenes.flatMap((s) => s.shots.map((sh) => sh.id)),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        aspectRatio,
        targetDurationMinutes: 3,
        targetAudience,
        visualStyle,
        videoFps: 30,
        resolution: '1080p',
      },
      scenes,
      characters: defaultCharacters,
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Create New Health Video Project</h3>
              <p className="text-xs text-slate-400">Configure topic, target audience, and organ cast</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Starting Method */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Story Starting Point</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setUseTemplate(true)}
                className={`p-3 rounded-xl border text-left transition ${
                  useTemplate
                    ? 'bg-amber-500/15 border-amber-500/50 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <span className="text-xs font-bold block mb-0.5">Tested Health Narrative</span>
                <span className="text-[11px] text-slate-500 block">
                  Curated organ dialogue & shot breakdowns
                </span>
              </button>

              <button
                type="button"
                onClick={() => setUseTemplate(false)}
                className={`p-3 rounded-xl border text-left transition ${
                  !useTemplate
                    ? 'bg-amber-500/15 border-amber-500/50 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <span className="text-xs font-bold block mb-0.5">Custom Health Topic</span>
                <span className="text-[11px] text-slate-500 block">
                  Generate scenes from your own topic
                </span>
              </button>
            </div>
          </div>

          {useTemplate ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Select Narrative</label>
              <select
                aria-label="Select Narrative"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                {STORY_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Enter Health / Biology Topic</label>
              <input
                type="text"
                placeholder="e.g. The Science of Muscle Growth, Sugar Rush, High Altitude Breathing..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Audience and Style Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Target Audience</label>
              <select
                aria-label="Target Audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Kids & Family">Kids & Family</option>
                <option value="Teens & Students">Teens & Students</option>
                <option value="General Public">General Public</option>
                <option value="Medical & Biology Enthusiasts">Medical Enthusiasts</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Visual Aesthetic</label>
              <select
                aria-label="Visual Aesthetic"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="3D Expressive Pixar Style">3D Expressive Pixar Style</option>
                <option value="2D Vibrant Comic Animation">2D Vibrant Comic Animation</option>
                <option value="Cyberpunk Sci-Fi Cellular">Cyberpunk Sci-Fi Cellular</option>
                <option value="Stylized Claymation Organics">Stylized Claymation Organics</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                  aspectRatio === '16:9'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                16:9 Landscape
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                  aspectRatio === '9:16'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                9:16 Vertical
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                  aspectRatio === '1:1'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                1:1 Square
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            type="button"
            className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow"
          >
            Create Production Studio
          </button>
        </div>
      </div>
    </div>
  );
};
