import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FolderTree,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Layers,
  Folder,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Film,
} from 'lucide-react';
import type { Project } from '../../types';
import { exportProjectToJson, importProjectFromJson } from '../../services/projectStorage';
import { canExportProject } from '../../services/stageGating';
import { ApprovalBadge } from '../common/StatusBadge';
import type { StudioTab } from '../layout/Sidebar';

interface ExportFileManagerProps {
  project: Project;
  onProjectImported: (project: Project) => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const ExportFileManager: React.FC<ExportFileManagerProps> = ({
  project,
  onProjectImported,
  onNavigateTab,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportGate = canExportProject(project);
  const finalEditStatus = project.finalEditApproval?.status || 'draft';

  // Generate CSV Shot List
  const handleExportCSV = () => {
    const headers = [
      'Scene',
      'Shot Code',
      'Shot Type',
      'Camera Instruction',
      'Description',
      'Characters',
      'Dialogues',
      'Status',
      'Runtime (Sec)',
      'Image Prompt',
      'Video Prompt',
    ];

    const rows = project.scenes.flatMap((scene) =>
      scene.shots.map((shot) => {
        const charNames = shot.characterIds
          .map((cid) => project.characters.find((c) => c.id === cid)?.name || cid)
          .join('; ');

        const dialogueSummary = shot.dialogues
          .map((d) => `${d.characterName}: "${d.line.replace(/"/g, '""')}"`)
          .join(' | ');

        return [
          `Scene ${scene.sceneNumber}: ${scene.title.replace(/"/g, '""')}`,
          shot.shotCode,
          shot.shotType,
          `"${shot.cameraInstruction.replace(/"/g, '""')}"`,
          `"${shot.description.replace(/"/g, '""')}"`,
          `"${charNames}"`,
          `"${dialogueSummary}"`,
          shot.status,
          shot.durationSec,
          `"${shot.imagePrompt.replace(/"/g, '""')}"`,
          `"${shot.videoPrompt.replace(/"/g, '""')}"`,
        ].join(',');
      })
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_ShotList.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate Screenplay Markdown
  const handleExportScreenplayMarkdown = () => {
    let md = `# ${project.title}\n`;
    md += `**Topic:** ${project.topic}\n`;
    md += `**Visual Style:** ${project.settings.visualStyle}\n`;
    md += `**Target Audience:** ${project.settings.targetAudience}\n`;
    md += `**Logline:** ${project.summary}\n\n`;
    md += `---\n\n`;

    project.scenes.forEach((scene) => {
      md += `## SCENE ${scene.sceneNumber}: ${scene.title.toUpperCase()}\n`;
      md += `*SETTING: ${scene.environment}*\n\n`;
      md += `${scene.description}\n\n`;

      scene.shots.forEach((shot) => {
        md += `### [${shot.shotCode}] ${shot.shotType.toUpperCase()} - ${shot.cameraInstruction}\n`;
        md += `${shot.description}\n\n`;

        shot.dialogues.forEach((dlg) => {
          md += `> **${dlg.characterName.toUpperCase()}** ${dlg.audioPrompt ? `*(${dlg.audioPrompt})*` : ''}\n`;
          md += `> "${dlg.line}"\n\n`;
        });
      });

      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Screenplay.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate Prompts Sheet
  const handleExportPromptsSheet = () => {
    let text = `=== HEALTH VIDEO STUDIO: PRODUCTION PROMPT SHEET ===\n`;
    text += `PROJECT: ${project.title}\n`;
    text += `STYLE: ${project.settings.visualStyle}\n`;
    text += `RATIO: ${project.settings.aspectRatio}\n\n`;

    project.scenes.forEach((scene) => {
      text += `\n=========================================\n`;
      text += `SCENE ${scene.sceneNumber}: ${scene.title}\n`;
      text += `ENVIRONMENT: ${scene.environment}\n`;
      text += `=========================================\n\n`;

      scene.shots.forEach((shot) => {
        text += `--- ${shot.shotCode} [${shot.shotType}] ---\n`;
        text += `CAMERA: ${shot.cameraInstruction}\n`;
        text += `IMAGE PROMPT (Midjourney / FLUX):\n${shot.imagePrompt}\n\n`;
        text += `VIDEO PROMPT (Runway / Luma / Kling):\n${shot.videoPrompt}\n\n`;
      });
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Prompts.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import JSON Project
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const content = reader.result as string;
        const imported = await importProjectFromJson(content);
        setImportStatus(`Successfully imported: "${imported.title}"`);
        onProjectImported(imported);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        alert('Failed to import JSON file. Please ensure it is a valid Health Video Studio export.');
      }
    };
    reader.readAsText(file);
  };

  // Virtual directory structure metrics
  const totalShots = project.scenes.flatMap((s) => s.shots);
  const totalDialogues = totalShots.flatMap((s) => s.dialogues);
  const totalAudioFiles = totalDialogues.filter((d) => Boolean(d.audioUrl)).length;
  const totalVideoFiles = totalShots.filter((s) => Boolean(s.attachedVideoUrl)).length;
  const totalImageFiles = totalShots.filter((s) => Boolean(s.attachedImageUrl)).length;
  const totalCharacters = project.characters.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-cyan-400 font-semibold tracking-wider">
              CORE FEATURE 7
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Export Pipelines, Screenplay Docs & File Organization
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Export & File Management
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={() => exportProjectToJson(project)}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Project JSON</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Stage Gate 6 Human Approval Notice */}
      {!exportGate.eligible ? (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-200 uppercase font-mono">
                  STAGE GATE 6 ENFORCEMENT
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-300">Final Edit Status:</span>
                <ApprovalBadge status={finalEditStatus} />
              </div>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                {exportGate.reason}
              </p>
              <p className="text-[11px] text-slate-400 pt-0.5">
                Policy Rule: Discrete project files cannot silently advance to distribution packaging without explicit human sign-off.
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('final_edit')}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition shrink-0 shadow"
            >
              <Film className="w-4 h-4" />
              <span>Review in Final Edit Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Master Verification Complete:</strong> Final cut is approved by human lead. All discrete shot files and manifests are certified.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
            CLEARED FOR EXPORT
          </span>
        </div>
      )}

      {/* Download Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Screenplay */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Educational Screenplay (.md)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Formatted movie screenplay with organ speaker dialogue, scene descriptions, and
              biological action notes.
            </p>
          </div>
          <button
            onClick={handleExportScreenplayMarkdown}
            type="button"
            className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Screenplay (.md)</span>
          </button>
        </div>

        {/* Card 2: Shot List CSV */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Production Shot List (.csv)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spreadsheet compatible with Excel, Google Sheets, and Notion for tracking camera
              angles, framing, dialogue, and status.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            type="button"
            className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Shot List (.csv)</span>
          </button>
        </div>

        {/* Card 3: AI Prompts Sheet */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">AI Prompt Sheet (.txt)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete batch of Midjourney/FLUX image prompts and Runway/Luma video generation
              prompts organized by scene.
            </p>
          </div>
          <button
            onClick={handleExportPromptsSheet}
            type="button"
            className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Prompt Sheet (.txt)</span>
          </button>
        </div>
      </div>

      {/* Virtual Studio Folder Explorer */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              PROJECT REPOSITORY FILE DIRECTORY
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Original media files preserved
          </span>
        </div>

        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 font-mono text-xs space-y-3">
          <div className="text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-800/60">
            <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span className="font-bold text-slate-200">
              /{project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}/
            </span>
          </div>

          <div className="pl-5 space-y-2">
            <div className="flex items-center justify-between text-slate-300 hover:text-white">
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-cyan-400" />
                <span>scripts/</span>
              </div>
              <span className="text-[11px] text-slate-500">
                1 screenplay, {project.scenes.length} scenes
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300 hover:text-white">
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-rose-400" />
                <span>characters/</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {totalCharacters} organ profiles (PNG / SVG transparent assets)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300 hover:text-white">
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>shots/prompts/</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {totalShots.length} shot prompts, {totalImageFiles} frames (FLUX / Runway / Luma)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300 hover:text-white">
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-purple-400" />
                <span>audio/</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {totalAudioFiles} shot recordings attached
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300 hover:text-white">
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                <span>videos/</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {totalVideoFiles} individual video clips attached (no combined file)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
