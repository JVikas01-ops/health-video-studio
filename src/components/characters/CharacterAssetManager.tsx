import React, { useState, useRef } from 'react';
import {
  Plus,
  Upload,
  Trash2,
  Sparkles,
  Smile,
  Mic,
  Check,
  Sliders,
} from 'lucide-react';
import type { Project, Character, CharacterPose, OrganType } from '../../types';

interface CharacterAssetManagerProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const CharacterAssetManager: React.FC<CharacterAssetManagerProps> = ({
  project,
  onUpdateProject,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    project.characters[0]?.id || ''
  );
  const [previewModalImage, setPreviewModalImage] = useState<{
    url: string;
    name: string;
    expression: string;
  } | null>(null);
  const [showAddPoseModal, setShowAddPoseModal] = useState(false);
  const [newPoseName, setNewPoseName] = useState('');
  const [newPoseExpression, setNewPoseExpression] = useState<CharacterPose['expression']>('happy');
  const [newPoseDescription, setNewPoseDescription] = useState('');
  const [newPoseImageBase64, setNewPoseImageBase64] = useState<string>('');

  const [showAddCharModal, setShowAddCharModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharOrgan, setNewCharOrgan] = useState<OrganType>('other');
  const [newCharPersonality, setNewCharPersonality] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newCharFileInputRef = useRef<HTMLInputElement>(null);

  const selectedCharacter =
    project.characters.find((c) => c.id === selectedCharacterId) || project.characters[0];

  // Convert uploaded image file to transparent PNG / Base64 Data URL
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (transparent PNG recommended).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      callback(result);
    };
    reader.readAsDataURL(file);
  };

  // Update Character properties
  const handleUpdateCharacter = (charId: string, updates: Partial<Character>) => {
    const updated = project.characters.map((c) => (c.id === charId ? { ...c, ...updates } : c));
    onUpdateProject({ ...project, characters: updated });
  };

  // Add new Pose to active character
  const handleSaveNewPose = () => {
    if (!selectedCharacter) return;
    if (!newPoseName.trim() || !newPoseImageBase64) {
      alert('Please provide a pose name and choose an image.');
      return;
    }

    const newPose: CharacterPose = {
      id: `pose-${Date.now()}`,
      name: newPoseName.trim(),
      expression: newPoseExpression,
      description: newPoseDescription.trim(),
      imageUrl: newPoseImageBase64,
      isDefault: false,
    };

    handleUpdateCharacter(selectedCharacter.id, {
      poses: [...selectedCharacter.poses, newPose],
    });

    setNewPoseName('');
    setNewPoseDescription('');
    setNewPoseImageBase64('');
    setShowAddPoseModal(false);
  };

  // Delete Pose
  const handleDeletePose = (charId: string, poseId: string) => {
    const char = project.characters.find((c) => c.id === charId);
    if (!char || char.poses.length <= 1) {
      alert('A character must have at least one pose.');
      return;
    }
    const updatedPoses = char.poses.filter((p) => p.id !== poseId);
    handleUpdateCharacter(charId, { poses: updatedPoses });
  };

  // Set default pose
  const handleSetDefaultPose = (charId: string, poseId: string) => {
    const char = project.characters.find((c) => c.id === charId);
    if (!char) return;
    const updatedPoses = char.poses.map((p) => ({
      ...p,
      isDefault: p.id === poseId,
    }));
    handleUpdateCharacter(charId, { poses: updatedPoses });
  };

  // Create new Custom Character
  const handleCreateCustomCharacter = () => {
    if (!newCharName.trim()) {
      alert('Please enter a character name.');
      return;
    }

    const newCharId = `char-${newCharOrgan}-${Date.now()}`;
    const defaultAvatarSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6" stroke="#fff" stroke-width="3"/><circle cx="38" cy="45" r="5" fill="#fff"/><circle cx="62" cy="45" r="5" fill="#fff"/><path d="M 40 65 Q 50 75 60 65" stroke="#fff" stroke-width="3" fill="none"/></svg>`
    )}`;

    const newCharacter: Character = {
      id: newCharId,
      projectId: project.id,
      name: newCharName.trim(),
      organType: newCharOrgan,
      colorBadge: '#38bdf8',
      personality: newCharPersonality.trim() || 'Enthusiastic and eager to explain biology.',
      voiceProfile: {
        voiceType: 'Energetic, informative',
        pitch: 'Medium',
        speakingRate: '1.0x',
        description: 'Clear educational voice.',
      },
      promptConsistencyPrefix: `Stylized 3D Pixar character ${newCharName.trim()}, expressive friendly biology character, octane render, clean studio lighting`,
      poses: [
        {
          id: `pose-default-${Date.now()}`,
          name: 'Default Pose',
          expression: 'neutral',
          description: 'Standard neutral pose',
          imageUrl: newPoseImageBase64 || defaultAvatarSvg,
          isDefault: true,
        },
      ],
    };

    onUpdateProject({ ...project, characters: [...project.characters, newCharacter] });
    setSelectedCharacterId(newCharId);
    setShowAddCharModal(false);
    setNewCharName('');
    setNewCharPersonality('');
    setNewPoseImageBase64('');
  };

  const defaultPose = selectedCharacter?.poses.find((p) => p.isDefault) || selectedCharacter?.poses[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-rose-400 font-semibold tracking-wider">
              CORE FEATURE 3
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">Transparent PNG Characters & Expression Rig</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Character Asset Manager
          </h1>
        </div>

        <button
          onClick={() => setShowAddCharModal(true)}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Character</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Character List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              ORGAN CAST ({project.characters.length})
            </span>
          </div>

          <div className="space-y-2">
            {project.characters.map((char) => {
              const isSelected = selectedCharacter?.id === char.id;
              const charDefault = char.poses.find((p) => p.isDefault) || char.poses[0];

              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacterId(char.id)}
                  type="button"
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 group ${
                    isSelected
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-200 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  {/* Avatar thumbnail with transparent checkered bg */}
                  <div
                    className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center p-1 border border-slate-700/60 shadow-inner overflow-hidden"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    }}
                  >
                    <img
                      src={charDefault?.imageUrl}
                      alt={char.name}
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100 truncate">{char.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: char.colorBadge }}
                        title={char.organType}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{char.poses.length} poses</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Character Details & Poses Manager */}
        {selectedCharacter && (
          <div className="lg:col-span-3 space-y-6">
            {/* Character Info Card */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl p-1.5 border border-slate-700 shadow-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-amber-400 transition"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                    }}
                    onClick={() =>
                      setPreviewModalImage({
                        url: defaultPose?.imageUrl || '',
                        name: selectedCharacter.name,
                        expression: defaultPose?.expression || 'neutral',
                      })
                    }
                    title="Click to preview full-size transparent image"
                  >
                    <img
                      src={defaultPose?.imageUrl}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={selectedCharacter.name}
                        onChange={(e) =>
                          handleUpdateCharacter(selectedCharacter.id, { name: e.target.value })
                        }
                        className="bg-transparent text-xl font-black text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none transition"
                      />
                      <span
                        className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: `${selectedCharacter.colorBadge}20`,
                          color: selectedCharacter.colorBadge,
                          border: `1px solid ${selectedCharacter.colorBadge}40`,
                        }}
                      >
                        {selectedCharacter.organType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{selectedCharacter.personality}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddPoseModal(true)}
                  type="button"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Pose (PNG)</span>
                </button>
              </div>

              {/* Personality & Prompt Consistency Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Personality & Behavioral Quirks</span>
                  </label>
                  <textarea
                    rows={2}
                    value={selectedCharacter.personality}
                    onChange={(e) =>
                      handleUpdateCharacter(selectedCharacter.id, { personality: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                    placeholder="Describe how this organ acts..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-rose-400" />
                    <span>Voice Profile & Audio Generator Prompt</span>
                  </label>
                  <textarea
                    rows={2}
                    value={selectedCharacter.voiceProfile.description}
                    onChange={(e) =>
                      handleUpdateCharacter(selectedCharacter.id, {
                        voiceProfile: {
                          ...selectedCharacter.voiceProfile,
                          description: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                    placeholder="ElevenLabs style voice instructions..."
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visual Consistency Prompt Prefix (Midjourney / FLUX)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={selectedCharacter.promptConsistencyPrefix}
                    onChange={(e) =>
                      handleUpdateCharacter(selectedCharacter.id, {
                        promptConsistencyPrefix: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-amber-400 resize-none"
                    placeholder="Prefix prepended to all shot prompts involving this character..."
                  />
                </div>
              </div>

              {/* Character Poses & Expressions Gallery */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase font-bold text-slate-200 flex items-center gap-2">
                    <Smile className="w-4 h-4 text-amber-400" />
                    <span>Poses & Expressions ({selectedCharacter.poses.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Transparent PNG Assets
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedCharacter.poses.map((pose) => (
                    <div
                      key={pose.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition group relative ${
                        pose.isDefault
                          ? 'bg-slate-950/80 border-amber-500/50 shadow-md shadow-amber-950/20'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Badge if default */}
                      {pose.isDefault && (
                        <span className="absolute top-2 right-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                          DEFAULT
                        </span>
                      )}

                      {/* Pose Transparent Preview */}
                      <div
                        onClick={() =>
                          setPreviewModalImage({
                            url: pose.imageUrl,
                            name: `${selectedCharacter.name} - ${pose.name}`,
                            expression: pose.expression,
                          })
                        }
                        className="w-full aspect-square rounded-lg p-2 mb-2.5 border border-slate-800 flex items-center justify-center cursor-pointer hover:border-amber-400 transition overflow-hidden"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                          backgroundSize: '10px 10px',
                          backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                        }}
                        title="Click to preview"
                      >
                        <img
                          src={pose.imageUrl}
                          alt={pose.name}
                          className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="space-y-1 mb-2">
                        <div className="text-xs font-bold text-slate-200 line-clamp-1">{pose.name}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                            {pose.expression}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        {!pose.isDefault ? (
                          <button
                            onClick={() => handleSetDefaultPose(selectedCharacter.id, pose.id)}
                            type="button"
                            className="text-[10px] text-slate-400 hover:text-amber-400 font-semibold"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}

                        {selectedCharacter.poses.length > 1 && (
                          <button
                            onClick={() => handleDeletePose(selectedCharacter.id, pose.id)}
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            title="Delete Pose"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Full-screen Transparent PNG Preview */}
      {previewModalImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">{previewModalImage.name}</h3>
                <span className="text-xs text-amber-400 font-mono uppercase">
                  Expression: {previewModalImage.expression}
                </span>
              </div>
              <button
                onClick={() => setPreviewModalImage(null)}
                type="button"
                className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Checkered background showcase for transparent PNG */}
            <div
              className="w-full h-80 rounded-xl p-4 flex items-center justify-center border border-slate-700 shadow-inner"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            >
              <img
                src={previewModalImage.url}
                alt={previewModalImage.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Transparent alpha channel verified</span>
              <button
                onClick={() => setPreviewModalImage(null)}
                type="button"
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Pose */}
      {showAddPoseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                Import Transparent PNG Pose for {selectedCharacter?.name}
              </h3>
              <button
                onClick={() => setShowAddPoseModal(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Pose / Expression Name</label>
                <input
                  type="text"
                  placeholder="e.g. Victorious Laugh, Exhausted Gasp..."
                  value={newPoseName}
                  onChange={(e) => setNewPoseName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Expression Mood</label>
                <select
                  aria-label="Expression Mood"
                  value={newPoseExpression}
                  onChange={(e) => setNewPoseExpression(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="happy">Happy / Laughing</option>
                  <option value="excited">Excited / High Energy</option>
                  <option value="panicked">Panicked / Shocked</option>
                  <option value="thinking">Thinking / Analytical</option>
                  <option value="exhausted">Exhausted / Fatigued</option>
                  <option value="proud">Proud / Victorious</option>
                  <option value="confused">Confused</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              {/* File Uploader */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">
                  Upload Transparent PNG File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/webp,image/svg+xml"
                  onChange={(e) => handleFileUpload(e, setNewPoseImageBase64)}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-4 text-center cursor-pointer transition bg-slate-950/60"
                >
                  {newPoseImageBase64 ? (
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="w-16 h-16 rounded-lg p-1 border border-slate-700"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                        }}
                      >
                        <img
                          src={newPoseImageBase64}
                          alt="preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-xs text-emerald-400 font-semibold">
                        Image Loaded (Click to change)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-400">
                      <Upload className="w-6 h-6 mx-auto text-amber-400 mb-1" />
                      <p className="text-xs font-semibold">Click to browse transparent PNG</p>
                      <p className="text-[10px] text-slate-500">PNG, WebP or SVG format</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddPoseModal(false)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewPose}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow"
              >
                Save Pose
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Character */}
      {showAddCharModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Add New Organ Cast Member</h3>
              <button
                onClick={() => setShowAddCharModal(false)}
                type="button"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Character Name</label>
                <input
                  type="text"
                  placeholder="e.g. Captain Pancreas, Sergeant Spleen, White Cell Alpha..."
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Organ Classification</label>
                <select
                  aria-label="Organ Classification"
                  value={newCharOrgan}
                  onChange={(e) => setNewCharOrgan(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="brain">Brain (Neurological)</option>
                  <option value="heart">Heart (Cardiovascular)</option>
                  <option value="lungs">Lungs (Respiratory)</option>
                  <option value="stomach">Stomach (Digestive)</option>
                  <option value="liver">Liver (Metabolic)</option>
                  <option value="kidneys">Kidneys (Renal)</option>
                  <option value="other">Other / Immune / Endocrine</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Personality Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe their personality..."
                  value={newCharPersonality}
                  onChange={(e) => setNewCharPersonality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Optional initial transparent PNG avatar */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">
                  Transparent Character Avatar (Optional)
                </label>
                <input
                  type="file"
                  ref={newCharFileInputRef}
                  accept="image/png,image/webp,image/svg+xml"
                  onChange={(e) => handleFileUpload(e, setNewPoseImageBase64)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => newCharFileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {newPoseImageBase64 ? 'Avatar Image Selected' : 'Choose PNG Avatar File'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddCharModal(false)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomCharacter}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
              >
                Create Character
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
