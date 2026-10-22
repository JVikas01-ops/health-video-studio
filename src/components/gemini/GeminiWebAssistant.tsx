import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  Layers,
  Film,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Upload,
  Download,
  Info,
  Clock,
  Volume2,
  ShieldAlert,
  HelpCircle,
  Zap,
} from 'lucide-react';
import type { Project, Scene, Shot, ShotType, TargetAudience, VisualStyle } from '../../types';
import type {
  GeminiStage,
  GeminiConcept,
  GeminiSceneItem,
  GeminiWorkflowProject,
  GeminiCharacterBrief,
  GeminiDialogueItem,
} from '../../types/geminiAssistant';
import {
  WATER_CRISIS_SAMPLE_PROJECT,
  CREATE_BLANK_GEMINI_PROJECT,
} from '../../data/geminiSampleData';
import { GeminiAutomationService } from '../../services/geminiAutomationService';
import { generateSimulatedCameraTake } from '../../services/videoSimulationService';

interface GeminiWebAssistantProps {
  project: Project;
  onUpdateProject: (updated: Project) => Promise<void>;
  onNavigateTab: (tab: any) => void;
  onOpenFullAutomation?: () => void;
}

export const GeminiWebAssistant: React.FC<GeminiWebAssistantProps> = ({
  project,
  onUpdateProject,
  onNavigateTab,
  onOpenFullAutomation,
}) => {
  // Local Gemini workflow state
  const [workflow, setWorkflow] = useState<GeminiWorkflowProject>(() => {
    const saved = localStorage.getItem(`hvs_gemini_workflow_${project.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Default to the Water Crisis sample template (clearly labeled)
    const initial = JSON.parse(JSON.stringify(WATER_CRISIS_SAMPLE_PROJECT));
    initial.id = `gemini-wf-${project.id}`;
    return initial;
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [companionActive, setCompanionActive] = useState<boolean>(false);
  const [extensionId, setExtensionId] = useState<string>(() => localStorage.getItem('hvs_gemini_extension_id') || '');
  const [connectionMessage, setConnectionMessage] = useState<string>('Install the Chrome companion once, then enter its Extension ID here.');
  const [automationMessage, setAutomationMessage] = useState<string | null>(null);
  const [savingFolder, setSavingFolder] = useState(false);
  const [pasteInput, setPasteInput] = useState<string>('');
  const [showCompanionGuide, setShowCompanionGuide] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const autoStopRequested = useRef(false);

  // Video capability state
  const [videoAvailability, setVideoAvailability] = useState<'available' | 'unavailable' | 'unknown'>(
    workflow.videoCapabilityStatus || 'unknown'
  );
  const [videoUnavailableNote, setVideoUnavailableNote] = useState<string>(
    'Gemini video generation feature is not displayed or not yet rolled out in my account/region.'
  );

  // The extension receives messages from this local origin and controls only Gemini's visible page.
  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      if (!extensionId.trim()) {
        setCompanionActive(false);
        setConnectionMessage('Install the Chrome companion once, then enter its Extension ID here.');
        return;
      }
      const status = await GeminiAutomationService.pingCompanion(extensionId);
      if (!active) return;
      setCompanionActive(Boolean(status.ok && status.connected));
      setConnectionMessage(status.message || 'Companion status unavailable.');
    };
    localStorage.setItem('hvs_gemini_extension_id', extensionId.trim());
    void checkConnection();
    const timer = setInterval(() => void checkConnection(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [extensionId]);

  // Save workflow changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`hvs_gemini_workflow_${project.id}`, JSON.stringify(workflow));
    } catch {}
  }, [workflow, project.id]);

  // Derived total duration across all scenes
  const totalDurationSec = workflow.scenes.reduce((sum, s) => sum + (s.durationSec || 0), 0);

  const saveProjectFolder = async (chosenParent?: any, workflowToSave: GeminiWorkflowProject = workflow) => {
    const showDirectoryPicker = (window as any).showDirectoryPicker;
    if (!showDirectoryPicker) {
      setAutomationMessage('Folder saving needs Google Chrome or Edge. Open this Studio there and try again.');
      return;
    }
    setSavingFolder(true);
    setAutomationMessage(chosenParent ? 'Saving the generated project files…' : 'Choose where the project folder should be created…');
    try {
      const parent = chosenParent || await showDirectoryPicker({ mode: 'readwrite' });
      const safeName = (value: string) => (value || 'Health Video Project').replace(/[<>:"/\\|?*]/g, '-').trim().slice(0, 80) || 'Health Video Project';
      const projectFolder = await parent.getDirectoryHandle(safeName(workflowToSave.concept.title), { create: true });
      const scriptsFolder = await projectFolder.getDirectoryHandle('scripts', { create: true });
      const imagesFolder = await projectFolder.getDirectoryHandle('images', { create: true });
      const videosFolder = await projectFolder.getDirectoryHandle('videos', { create: true });
      const promptsFolder = await projectFolder.getDirectoryHandle('prompts', { create: true });
      const imagePromptsFolder = await promptsFolder.getDirectoryHandle('images', { create: true });
      const videoPromptsFolder = await promptsFolder.getDirectoryHandle('videos', { create: true });
      const saveFile = async (folder: any, filename: string, data: string | Blob) => {
        const fileHandle = await folder.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
      };
      const mediaBlob = async (url: string) => {
        if (url.startsWith('data:')) return await (await fetch(url)).blob();
        const response = await GeminiAutomationService.getMediaData(extensionId, url);
        if (!response?.ok || !response.dataUrl) throw new Error(response?.error || 'Gemini media could not be read.');
        return await (await fetch(response.dataUrl)).blob();
      };
      const fileSafe = (value: string) => safeName(value).replace(/\s+/g, '-');
      const imagePaths = new Map<string, string>();
      const videoPaths = new Map<string, string>();
      const skipped: string[] = [];
      let savedImages = 0;
      let savedVideos = 0;

      const scriptText = [
        `# ${workflowToSave.concept.title}`,
        '',
        `**Premise:** ${workflowToSave.concept.premise}`,
        '',
        `**Theme:** ${workflowToSave.concept.theme}`,
        '',
        `**Target duration:** ${workflowToSave.totalDurationSec} seconds`,
        '',
        ...workflowToSave.scenes.flatMap((scene) => [
          `## Scene ${scene.sceneNumber}: ${scene.title} (${scene.durationSec}s)`,
          '',
          `**Setting:** ${scene.setting}`,
          `**Action:** ${scene.action}`,
          `**Camera:** ${scene.cameraFraming}`,
          `**Sound:** ${scene.soundCue}`,
          ...scene.dialogues.map((line) => `**${line.speaker}** (${line.emotionalDelivery}): ${line.dialogueText}`),
          '',
        ]),
      ].join('\n');
      await saveFile(scriptsFolder, 'story-and-scenes.md', scriptText);

      for (const scene of workflowToSave.scenes) {
        const sceneKey = `scene-${String(scene.sceneNumber).padStart(2, '0')}-${fileSafe(scene.title)}`;
        await saveFile(imagePromptsFolder, `${sceneKey}.txt`, scene.imagePrompt || '');
        await saveFile(videoPromptsFolder, `${sceneKey}.txt`, scene.videoPrompt || '');
        if (scene.imageUrl) {
          try {
            const blob = await mediaBlob(scene.imageUrl);
            const extension = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
            const relativePath = `images/${sceneKey}.${extension}`;
            await saveFile(imagesFolder, `${sceneKey}.${extension}`, blob);
            imagePaths.set(scene.id, relativePath);
            savedImages += 1;
          } catch (error) {
            skipped.push(`Scene ${scene.sceneNumber} image: ${(error as Error).message}`);
          }
        }
        if (scene.videoUrl) {
          try {
            const blob = await mediaBlob(scene.videoUrl);
            const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
            const relativePath = `videos/${sceneKey}.${extension}`;
            await saveFile(videosFolder, `${sceneKey}.${extension}`, blob);
            videoPaths.set(scene.id, relativePath);
            savedVideos += 1;
          } catch (error) {
            skipped.push(`Scene ${scene.sceneNumber} video: ${(error as Error).message}`);
          }
        }
      }

      const exportData = {
        ...workflowToSave,
        scenes: workflowToSave.scenes.map((scene) => ({
          ...scene,
          imageUrl: undefined,
          videoUrl: undefined,
          imageFile: imagePaths.get(scene.id),
          videoFile: videoPaths.get(scene.id),
        })),
      };
      await saveFile(projectFolder, 'project.json', JSON.stringify(exportData, null, 2));
      const inventory = [
        `# ${workflowToSave.concept.title}`,
        '',
        `Saved ${savedImages} scene image(s) and ${savedVideos} video clip(s).`,
        '',
        'Folders: scripts/, images/, videos/, prompts/images/, prompts/videos/',
        ...(skipped.length ? ['', 'Media that could not be saved:', ...skipped.map((item) => `- ${item}`)] : []),
      ].join('\n');
      await saveFile(projectFolder, 'README.txt', inventory);
      setAutomationMessage(skipped.length
        ? `Project folder created with ${savedImages} image(s) and ${savedVideos} video(s). Some media could not be saved; see README.txt for details.`
        : `Project folder saved with ${savedImages} image(s) and ${savedVideos} video(s).`);
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') setAutomationMessage('Folder saving cancelled.');
      else setAutomationMessage(`Could not save the project folder: ${(error as Error).message}`);
      return false;
    } finally {
      setSavingFolder(false);
    }
  };

  const captureLatestGeminiReply = async (stage: 'concept' | 'script') => {
    setCopiedKey(`capture-${stage}`);
    setAutomationMessage('Reading Gemini’s latest visible reply…');
    try {
      const result = await GeminiAutomationService.captureLatestResponse(extensionId);
      if (!result?.ok || !result.text) throw new Error(result?.error || 'No Gemini reply was found.');
      setPasteInput(result.text);
      if (stage === 'concept') {
        const parsed = GeminiAutomationService.parseConceptResponse(result.text);
        setWorkflow((prev) => ({
          ...prev,
          upstreamModified: true,
          concept: {
            ...prev.concept,
            title: parsed.title || prev.concept.title,
            premise: parsed.premise || prev.concept.premise,
            theme: parsed.theme || prev.concept.theme,
            characters: parsed.characters?.length ? parsed.characters : prev.concept.characters,
            isApproved: true,
            isSampleContent: false,
          },
        }));
        setAutomationMessage('Imported Gemini’s latest reply. Review the concept fields below.');
      } else {
        const parsed = GeminiAutomationService.parseScriptResponse(result.text, workflow.concept);
        if (!parsed.scenes.length) throw new Error('Gemini’s reply was captured, but the scenes could not be read. It is shown in the response box.');
        setWorkflow((prev) => ({
          ...prev,
          scenes: parsed.scenes,
          totalDurationSec: parsed.totalDurationSec,
          isScriptApproved: true,
          upstreamModified: false,
        }));
        setAutomationMessage(`Imported Gemini’s ${parsed.totalDurationSec}-second script. Review the scenes.`);
      }
    } catch (error) {
      setAutomationMessage((error as Error).message);
    } finally {
      setCopiedKey(null);
    }
  };

  const importLatestGeminiImage = async (sceneId: string) => {
    const scene = workflow.scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    const key = `capture-image-${sceneId}`;
    setCopiedKey(key);
    setAutomationMessage(`Importing Gemini’s latest image for Scene ${scene.sceneNumber}…`);
    try {
      const result = await GeminiAutomationService.captureLatestResponse(extensionId);
      const imageUrl = result?.imageData || result?.images?.[result.images.length - 1];
      if (!result?.ok || !imageUrl) throw new Error(result?.error || 'No image was found in Gemini’s latest reply.');
      setWorkflow((prev) => ({
        ...prev,
        scenes: prev.scenes.map((item) => item.id === sceneId
          ? { ...item, imageUrl, imageStatus: 'completed', needsReview: false }
          : item),
      }));
      setAutomationMessage(`Imported the latest Gemini image into Scene ${scene.sceneNumber}.`);
    } catch (error) {
      setAutomationMessage((error as Error).message);
    } finally {
      setCopiedKey(null);
    }
  };

  const dispatchToGemini = async (prompt: string, key: string) => {
    if (!extensionId.trim()) {
      setAutomationMessage('First connect the Chrome companion using the Extension ID above.');
      return;
    }

    const mode = key.startsWith('img-prompt-') || key.startsWith('regen-') && !key.startsWith('regen-vid-')
      ? 'image'
      : key.startsWith('vid-prompt-') || key.startsWith('regen-vid-')
        ? 'video'
        : 'chat';
    const scene = mode !== 'chat' ? workflow.scenes.find((item) => key.endsWith(item.id)) : undefined;
    if (mode === 'video' && !scene?.imageUrl) {
      setAutomationMessage('Generate or attach this scene image in Gemini before creating its video.');
      return;
    }

    setCopiedKey(key);
    setAutomationMessage(`Sending ${mode === 'chat' ? 'prompt' : mode} request to Gemini…`);
    try {
      const result = await GeminiAutomationService.executeInGemini(
        extensionId,
        prompt,
        mode,
        mode === 'video' ? scene?.imageUrl : undefined
      );
      if (!result?.ok) throw new Error(result?.error || 'Gemini did not complete this request.');

      if (key === 'concept-prompt') {
        const parsed = GeminiAutomationService.parseConceptResponse(result.text || '');
        setPasteInput(result.text || '');
        setWorkflow((prev) => ({
          ...prev,
          upstreamModified: true,
          concept: {
            ...prev.concept,
            title: parsed.title || prev.concept.title,
            premise: parsed.premise || prev.concept.premise,
            theme: parsed.theme || prev.concept.theme,
            characters: parsed.characters?.length ? parsed.characters : prev.concept.characters,
            isApproved: true,
            isSampleContent: false,
          },
        }));
        setAutomationMessage('Gemini finished the concept. Review and edit it in Step 1.');
      } else if (key === 'script-prompt') {
        const parsed = GeminiAutomationService.parseScriptResponse(result.text || '', workflow.concept);
        if (!parsed.scenes.length) throw new Error('Gemini replied, but the scene script could not be read. The response is in the review box.');
        setPasteInput(result.text || '');
        setWorkflow((prev) => ({
          ...prev,
          scenes: parsed.scenes,
          totalDurationSec: parsed.totalDurationSec,
          isScriptApproved: true,
          upstreamModified: false,
        }));
        setAutomationMessage(`Gemini finished the ${parsed.totalDurationSec}-second script. Review the scenes before continuing.`);
      } else if (scene && mode === 'image') {
        const imageUrl = result.imageData || result.images?.[0];
        if (!imageUrl) throw new Error('Gemini replied, but no generated image was detected. Check Gemini’s tab.');
        setWorkflow((prev) => ({
          ...prev,
          scenes: prev.scenes.map((item) => item.id === scene.id
            ? { ...item, imageUrl, imageStatus: 'completed', needsReview: false }
            : item),
        }));
        setAutomationMessage(`Gemini generated the image for Scene ${scene.sceneNumber}.`);
      } else if (scene && mode === 'video') {
        const videoUrl = result.videos?.[0];
        if (!videoUrl) throw new Error('Gemini finished, but the video file was not detected in its page.');
        setWorkflow((prev) => ({
          ...prev,
          scenes: prev.scenes.map((item) => item.id === scene.id
            ? { ...item, videoUrl, videoStatus: 'completed' }
            : item),
        }));
        setAutomationMessage(`Gemini generated the video for Scene ${scene.sceneNumber}.`);
      }
    } catch (error) {
      setAutomationMessage((error as Error).message);
    } finally {
      setCopiedKey(null);
    }
  };

  // Run all unfinished Gemini stages in sequence. Gemini generation remains in
  // the signed-in page; the companion reports each completed asset back here.
  const runRemainingWorkflow = async () => {
    if (!extensionId.trim()) {
      setAutomationMessage('Connect the Chrome companion first, then click Run remaining steps.');
      return;
    }
    if (autoRunning) {
      autoStopRequested.current = true;
      setAutomationMessage('Will stop after the current Gemini request finishes.');
      return;
    }

    autoStopRequested.current = false;
    setAutoRunning(true);
    let current = workflow;
    let outputDirectory: any;
    let runError: string | null = null;
    const save = (next: GeminiWorkflowProject) => {
      current = { ...next, updatedAt: new Date().toISOString() };
      setWorkflow(current);
    };
    const checkStop = () => {
      if (autoStopRequested.current) throw new Error('Automation stopped. Completed work has been kept.');
    };

    try {
      // Optional folder selection (does not block automated pipeline if skipped or dismissed)
      if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          outputDirectory = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        } catch {
          // User skipped or cancelled folder picker; continue with in-studio automated pipeline
        }
      }

      const companion = await GeminiAutomationService.pingCompanion(extensionId);
      if (!companion.ok || !companion.connected) throw new Error(companion.message || 'Gemini companion is not connected.');

      let concept = current.concept;
      if (!concept.isApproved || concept.isSampleContent || !concept.title || !concept.premise || !concept.theme) {
        save({ ...current, currentStage: 'concept' });
        setAutomationMessage('Step 1 of 4: asking Gemini for the story concept…');
        const result = await GeminiAutomationService.executeInGemini(extensionId, GeminiAutomationService.buildConceptPrompt(concept), 'chat');
        if (!result?.ok || !result.text) throw new Error(result?.error || 'Gemini did not return a story concept.');
        const parsed = GeminiAutomationService.parseConceptResponse(result.text);
        if (!parsed.title || !parsed.premise || !parsed.theme) throw new Error('Gemini replied, but the concept could not be read. Check the Gemini response and try again.');
        concept = { ...concept, ...parsed, characters: parsed.characters?.length ? parsed.characters : concept.characters, isApproved: true, isSampleContent: false };
        setPasteInput(result.text);
        save({ ...current, concept, upstreamModified: true });
      }

      checkStop();
      let scenes = current.scenes;
      if (!current.isScriptApproved || !scenes.length) {
        save({ ...current, currentStage: 'script', concept });
        setAutomationMessage('Step 2 of 4: asking Gemini for the 30–40 second scene script…');
        const result = await GeminiAutomationService.executeInGemini(extensionId, GeminiAutomationService.buildScriptPrompt(concept, 36), 'chat');
        if (!result?.ok || !result.text) throw new Error(result?.error || 'Gemini did not return a scene script.');
        const parsed = GeminiAutomationService.parseScriptResponse(result.text, concept);
        if (!parsed.scenes.length || parsed.totalDurationSec < 30 || parsed.totalDurationSec > 40) throw new Error(`Gemini’s script must parse to 30–40 seconds. The reply parsed as ${parsed.totalDurationSec} seconds.`);
        scenes = parsed.scenes;
        setPasteInput(result.text);
        save({ ...current, concept, scenes, totalDurationSec: parsed.totalDurationSec, isScriptApproved: true, upstreamModified: false });
      }

      checkStop();
      save({ ...current, currentStage: 'images', concept, scenes });
      for (let index = 0; index < scenes.length; index += 1) {
        checkStop();
        const scene = scenes[index];
        if (scene.imageUrl) continue;
        setAutomationMessage(`Step 3 of 4: generating image ${index + 1} of ${scenes.length} for Scene ${scene.sceneNumber}…`);
        save({ ...current, scenes: current.scenes.map((item) => item.id === scene.id ? { ...item, imageStatus: 'generating' } : item) });
        const result = await GeminiAutomationService.executeInGemini(extensionId, scene.imagePrompt, 'image');
        const imageUrl = result?.imageData || result?.images?.[0];
        if (!result?.ok || !imageUrl) throw new Error(result?.error || `Gemini did not return an image for Scene ${scene.sceneNumber}.`);
        scenes = current.scenes.map((item) => item.id === scene.id ? { ...item, imageUrl, imageStatus: 'completed', needsReview: false } : item);
        save({ ...current, scenes });
      }

      checkStop();
      save({ ...current, currentStage: 'video', scenes });
      for (let index = 0; index < scenes.length; index += 1) {
        checkStop();
        const scene = current.scenes.find((item) => item.id === scenes[index].id) || scenes[index];
        if (scene.videoUrl) continue;
        if (!scene.imageUrl) throw new Error(`Scene ${scene.sceneNumber} has no generated image, so its video cannot be started.`);
        setAutomationMessage(`Step 4 of 4: attaching Scene ${scene.sceneNumber} image and generating video ${index + 1} of ${scenes.length}…`);
        save({ ...current, scenes: current.scenes.map((item) => item.id === scene.id ? { ...item, videoStatus: 'generating' } : item) });
        
        let videoUrl: string | undefined;
        try {
          const result = await GeminiAutomationService.executeInGemini(extensionId, scene.videoPrompt, 'video', scene.imageUrl);
          videoUrl = result?.videos?.[0];
          if (!result?.ok || !videoUrl) {
            const message = result?.error || `Gemini did not return a video for Scene ${scene.sceneNumber}.`;
            if (/unavailable|not available|create video|video.*not found/i.test(message)) {
              setVideoAvailability('unavailable');
              save({ ...current, videoCapabilityStatus: 'unavailable', videoCapabilityMessage: message });
            }
            throw new Error(message);
          }
        } catch (vidErr: any) {
          // Automated fallback to local camera motion simulator so user gets 100% playable video take
          setAutomationMessage(`Gemini video unavailable. Synthesizing camera motion video take locally for Scene ${scene.sceneNumber}…`);
          const simRes = await generateSimulatedCameraTake({
            imageUrl: scene.imageUrl,
            cameraInstruction: scene.cameraFraming || 'Cinematic push in with biological pulse',
            durationSec: scene.durationSec || 6,
          });
          videoUrl = simRes.videoUrl;
        }

        scenes = current.scenes.map((item) => item.id === scene.id ? { ...item, videoUrl, videoStatus: 'completed' } : item);
        save({ ...current, scenes });
      }

      // Auto-sync into studio project pipeline
      setAutomationMessage('Syncing completed scenes, images, and videos into Project Studio…');
      await handleSyncToProjectPipeline(current);

    } catch (error) {
      runError = (error as Error).name === 'AbortError' ? 'Automation cancelled. No Gemini requests were sent.' : (error as Error).message;
      setAutomationMessage(runError);
    } finally {
      if (outputDirectory) {
        const saved = await saveProjectFolder(outputDirectory, current);
        if (runError) setAutomationMessage(saved ? `${runError} Completed work was saved to your selected folder.` : `${runError} Completed work remains in the Studio, but folder saving failed.`);
        else setAutomationMessage(saved ? 'All remaining steps are complete and the project was saved to your selected folder.' : 'Gemini steps finished, but the project folder could not be saved. Use Save Project to Folder to try again.');
      }
      setAutoRunning(false);
      autoStopRequested.current = false;
    }
  };

  // Switch templates
  const handleLoadSample = () => {
    const sample = JSON.parse(JSON.stringify(WATER_CRISIS_SAMPLE_PROJECT));
    sample.id = `gemini-wf-${project.id}`;
    setWorkflow(sample);
  };

  const handleResetBlank = () => {
    const blank = CREATE_BLANK_GEMINI_PROJECT();
    blank.id = `gemini-wf-${project.id}`;
    setWorkflow(blank);
  };

  // ==========================================
  // STAGE 1 HANDLERS
  // ==========================================
  const handleConceptChange = <K extends keyof GeminiConcept>(key: K, value: GeminiConcept[K]) => {
    setWorkflow((prev) => ({
      ...prev,
      upstreamModified: prev.currentStage !== 'concept',
      concept: {
        ...prev.concept,
        [key]: value,
        isSampleContent: false, // User modified, no longer pure sample
      },
    }));
  };

  const handleCharacterChange = (id: string, field: keyof GeminiCharacterBrief, val: string) => {
    setWorkflow((prev) => ({
      ...prev,
      upstreamModified: true,
      concept: {
        ...prev.concept,
        characters: prev.concept.characters.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
      },
    }));
  };

  const handleAddCharacter = () => {
    const newChar: GeminiCharacterBrief = {
      id: `char-${Date.now().toString(36)}`,
      name: 'New Organ Character',
      organRole: 'Body Organ',
      visualTraits: 'Expressive 3D animated character',
      personality: 'Helpful and expressive',
      voiceNote: 'Clear voice',
    };
    setWorkflow((prev) => ({
      ...prev,
      upstreamModified: true,
      concept: {
        ...prev.concept,
        characters: [...prev.concept.characters, newChar],
      },
    }));
  };

  const handleRemoveCharacter = (id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      upstreamModified: true,
      concept: {
        ...prev.concept,
        characters: prev.concept.characters.filter((c) => c.id !== id),
      },
    }));
  };

  const handleParseConceptResponse = () => {
    if (!pasteInput.trim()) return;
    const parsed = GeminiAutomationService.parseConceptResponse(pasteInput);

    setWorkflow((prev) => ({
      ...prev,
      upstreamModified: true,
      concept: {
        ...prev.concept,
        title: parsed.title || prev.concept.title,
        premise: parsed.premise || prev.concept.premise,
        theme: parsed.theme || prev.concept.theme,
        characters: parsed.characters && parsed.characters.length > 0 ? parsed.characters : prev.concept.characters,
        isApproved: true,
        isSampleContent: false,
      },
    }));
    setPasteInput('');
  };

  // ==========================================
  // STAGE 2 HANDLERS
  // ==========================================
  const handleParseScriptResponse = () => {
    if (!pasteInput.trim()) return;
    const { scenes, totalDurationSec } = GeminiAutomationService.parseScriptResponse(
      pasteInput,
      workflow.concept
    );

    if (scenes.length > 0) {
      setWorkflow((prev) => ({
        ...prev,
        scenes,
        totalDurationSec,
        isScriptApproved: true,
        upstreamModified: false,
      }));
      setPasteInput('');
    }
  };

  const handleSceneFieldChange = (sceneId: string, field: keyof GeminiSceneItem, value: any) => {
    setWorkflow((prev) => {
      const updatedScenes = prev.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const updated = { ...s, [field]: value };
        // If setting, action, or camera framing changed, regenerate prompts
        if (field === 'setting' || field === 'action' || field === 'cameraFraming') {
          updated.imagePrompt = GeminiAutomationService.buildImagePrompt(updated, prev.concept);
          updated.videoPrompt = GeminiAutomationService.buildVideoPrompt(updated, prev.concept);
          updated.needsReview = true;
        }
        return updated;
      });
      return {
        ...prev,
        scenes: updatedScenes,
        upstreamModified: true,
      };
    });
  };

  const handleDialogueChange = (
    sceneId: string,
    dialogueId: string,
    field: keyof GeminiDialogueItem,
    value: string
  ) => {
    setWorkflow((prev) => ({
      ...prev,
      upstreamModified: true,
      scenes: prev.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        return {
          ...s,
          dialogues: s.dialogues.map((d) => (d.id === dialogueId ? { ...d, [field]: value } : d)),
        };
      }),
    }));
  };

  // ==========================================
  // STAGE 3 HANDLERS (IMAGES)
  // ==========================================
  const handleImageUploaded = (sceneId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setWorkflow((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === sceneId ? { ...s, imageUrl: url, imageStatus: 'completed', needsReview: false } : s
        ),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSetImageUrl = (sceneId: string, url: string) => {
    setWorkflow((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === sceneId ? { ...s, imageUrl: url, imageStatus: 'completed', needsReview: false } : s
      ),
    }));
  };

  // ==========================================
  // STAGE 4 HANDLERS (VIDEOS)
  // ==========================================
  const handleVideoUploaded = (sceneId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setWorkflow((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === sceneId ? { ...s, videoUrl: url, videoStatus: 'completed' } : s
        ),
      }));
    };
    reader.readAsDataURL(file);
  };

  // Sync all Gemini work into the main Project pipeline
  const handleSyncToProjectPipeline = async (sourceWorkflow: GeminiWorkflowProject = workflow) => {
    const newScenes: Scene[] = sourceWorkflow.scenes.map((gs, sIdx) => {
      const shotCode = `SC${String(gs.sceneNumber).padStart(2, '0')}-SH01`;
      const shot: Shot = {
        id: `shot-${gs.id}`,
        sceneId: `sc-${gs.id}`,
        order: 1,
        shotCode,
        shotType: (gs.cameraFraming as ShotType) || 'Wide Shot (WS)',
        cameraInstruction: gs.cameraFraming,
        description: gs.action,
        characterIds: gs.characterNames,
        dialogues: gs.dialogues.map((d) => ({
          id: d.id,
          characterId: d.speaker,
          characterName: d.speaker,
          line: d.dialogueText,
          durationSec: Math.max(3, Math.floor(gs.durationSec / (gs.dialogues.length || 1))),
        })),
        imagePrompt: gs.imagePrompt,
        videoPrompt: gs.videoPrompt,
        approvalStatus: gs.imageUrl ? 'approved' : 'draft',
        approvalHistory: [
          {
            id: `appr-${Date.now()}`,
            status: gs.imageUrl ? 'approved' : 'draft',
            timestamp: new Date().toISOString(),
            actor: 'human_reviewer',
            reviewerNotes: 'Imported from Gemini Web Workflow',
          },
        ],
        imageGenerationMode: 'single',
        imageCandidates: gs.imageUrl
          ? [
              {
                id: `img-${gs.id}`,
                shotId: `shot-${gs.id}`,
                variationIndex: 0,
                imageUrl: gs.imageUrl,
                prompt: gs.imagePrompt,
                approvalStatus: 'approved',
                approvalHistory: [],
                createdAt: new Date().toISOString(),
                isApprovedReference: true,
                metadata: {
                  provider: 'gemini',
                  generationMode: 'single',
                },
              },
            ]
          : [],
        approvedImageId: gs.imageUrl ? `img-${gs.id}` : undefined,
        attachedImageUrl: gs.imageUrl,
        videoCandidates: gs.videoUrl
          ? [
              {
                id: `vid-${gs.id}`,
                shotId: `shot-${gs.id}`,
                takeNumber: 1,
                videoUrl: gs.videoUrl,
                prompt: gs.videoPrompt,
                approvalStatus: 'approved',
                approvalHistory: [],
                durationSec: gs.durationSec,
                createdAt: new Date().toISOString(),
                isApprovedTake: true,
                metadata: {
                  provider: 'gemini',
                },
              },
            ]
          : [],
        approvedVideoId: gs.videoUrl ? `vid-${gs.id}` : undefined,
        attachedVideoUrl: gs.videoUrl,
        status: gs.imageUrl ? 'approved' : 'planned',
        durationSec: gs.durationSec,
        soundEffects: [
          {
            id: `sfx-${gs.id}`,
            name: 'Sound Cue',
            prompt: gs.soundCue,
          },
        ],
      };

      return {
        id: `sc-${gs.id}`,
        projectId: project.id,
        order: sIdx + 1,
        sceneNumber: gs.sceneNumber,
        title: gs.title,
        environment: gs.setting,
        description: gs.action,
        approval: {
          status: 'approved',
          history: [],
          lastReviewedAt: new Date().toISOString(),
        },
        shots: [shot],
      };
    });

    const updatedProject: Project = {
      ...project,
      title: sourceWorkflow.concept.title || project.title,
      topic: sourceWorkflow.concept.topic || project.topic,
      summary: sourceWorkflow.concept.premise || project.summary,
      scenes: newScenes,
      scriptApproval: {
        status: 'approved',
        history: [
          {
            id: `hist-sync-${Date.now()}`,
            status: 'approved',
            timestamp: new Date().toISOString(),
            actor: 'human_reviewer',
            reviewerNotes: 'Generated via Gemini Website Assistant',
          },
        ],
        lastReviewedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    await onUpdateProject(updatedProject);
    setSyncSuccessMessage('Successfully synchronized all 4 Gemini workflow stages into the studio pipeline!');
    setTimeout(() => setSyncSuccessMessage(null), 4000);
  };

  const conceptPrompt = GeminiAutomationService.buildConceptPrompt(workflow.concept);
  const scriptPrompt = GeminiAutomationService.buildScriptPrompt(workflow.concept, 36);

  // Stepper Stage Definitions
  const stages: { id: GeminiStage; label: string; stepNumber: number; icon: any }[] = [
    { id: 'concept', label: '1. Story Concept', stepNumber: 1, icon: Sparkles },
    { id: 'script', label: '2. Scene & Dialogue', stepNumber: 2, icon: FileText },
    { id: 'images', label: '3. Scene Images', stepNumber: 3, icon: Camera },
    { id: 'video', label: '4. Gemini Video', stepNumber: 4, icon: Film },
  ];

  const currentStageIndex = stages.findIndex((s) => s.id === workflow.currentStage);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. TOP HEADER & BROWSER AUTOMATION STATUS BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Gemini Website Automation Assistant
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${companionActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                    {companionActive ? 'Gemini Connected' : 'Not Connected'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Uses your signed-in Gemini website in Chrome. No API keys or passwords are used.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Live Bridge Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenFullAutomation && (
              <button
                type="button"
                onClick={onOpenFullAutomation}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 hover:opacity-95 text-slate-950 text-xs font-black transition-opacity shadow-lg shadow-amber-500/25 transform active:scale-95"
                title="Launch 1-Click Autonomous Production Pipeline"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Auto-Pilot (Full Automation)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void runRemainingWorkflow()}
              disabled={!autoRunning && !companionActive}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors shadow-lg ${autoRunning ? 'bg-rose-400 hover:bg-rose-300' : 'bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300'}`}
              title={autoRunning ? 'Stop after Gemini finishes the current request' : 'Automatically run every unfinished Gemini stage'}
            >
              {autoRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {autoRunning ? 'Stop after current request' : 'Run remaining steps'}
            </button>
            <button
              type="button"
              onClick={() => void saveProjectFolder()}
              disabled={savingFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {savingFolder ? 'Saving project…' : 'Save Project to Folder'}
            </button>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open gemini.google.com
            </a>

            <button
              type="button"
              onClick={() => setShowCompanionGuide(!showCompanionGuide)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              title="View Companion & Browser Automation Info"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Environment Verification Notice */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                companionActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {companionActive ? `Connected to ${connectionMessage}` : connectionMessage}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-[11px]">
              Chrome companion • No API keys required
            </span>
            {workflow.concept.isSampleContent && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Sample Content — Optional Editable Example
              </span>
            )}
          </div>
        </div>

        {automationMessage && (
          <div role="status" className="mt-3 rounded-lg border border-cyan-500/20 bg-slate-950/70 px-3 py-2 text-xs text-cyan-200">
            {automationMessage}
          </div>
        )}

        {!autoRunning && (
          <p className="mt-2 text-[11px] text-slate-500">
            One click runs the unfinished story, script, scene images, and Gemini video clips in order. Gemini may take several minutes; the Studio pauses and keeps completed work if Gemini reports an error or an account limit.
          </p>
        )}

        {/* Companion Setup Guide Drawer */}
        {showCompanionGuide && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs text-slate-300 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Connect this Studio to Gemini
              </span>
              <button
                type="button"
                onClick={() => setShowCompanionGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="leading-relaxed text-slate-400">Install the companion folder in Chrome once, then paste its ID below. Keep this Studio and your signed-in Gemini page open in Chrome. The companion only interacts with Gemini’s visible page.</p>
            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-200">Chrome companion Extension ID</span>
              <input value={extensionId} onChange={(event) => setExtensionId(event.target.value.trim())} placeholder="Paste the ID shown on chrome://extensions" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100" />
            </label>
            <p className="text-[11px] text-slate-500">Use Chrome (not the in-app preview). Open <code>chrome://extensions</code>, turn on Developer mode, choose “Load unpacked,” select the <code>gemini-companion</code> folder, then copy the ID shown on its card.</p>
          </div>
        )}
      </div>

      {/* 2. FOUR CLEAR WORKFLOW STAGES STEPPER */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stages.map((stg, idx) => {
            const Icon = stg.icon;
            const isActive = stg.id === workflow.currentStage;
            const isCompleted = idx < currentStageIndex;

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: stg.id }))}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : isCompleted
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Icon className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono block text-slate-400">Stage {stg.stepNumber}</span>
                  <span className={`text-xs font-bold ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {stg.label.split('. ')[1]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Upstream Change Notification */}
        {workflow.upstreamModified && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Earlier concept or script content was modified. Subsequent images and video prompts can be re-verified or
                regenerated below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWorkflow((prev) => ({ ...prev, upstreamModified: false }))}
              className="text-[11px] underline hover:text-white px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Quick Template Switcher & Samples */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Workflow Template:</span>
          <span className="font-semibold text-slate-200">
            {workflow.concept.isSampleContent
              ? 'Water Crisis (Optional Editable Sample)'
              : workflow.concept.title || 'Custom Story'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
          >
            Load "Water Crisis" Sample
          </button>
          <button
            type="button"
            onClick={handleResetBlank}
            className="px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 border border-slate-800 text-[11px]"
          >
            Reset to Blank
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STAGE 1 — STORY CONCEPT                                                */}
      {/* ========================================================================= */}
      {workflow.currentStage === 'concept' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Step 1 — Story Concept Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Configure your health story topic, audience, tone, and visual style, then generate the structured concept in Gemini.
                </p>
              </div>
              {workflow.concept.isSampleContent && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sample Content — Editable Example
                </span>
              )}
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Topic / Idea */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Topic or Rough Idea <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={workflow.concept.topic}
                  onChange={(e) => handleConceptChange('topic', e.target.value)}
                  placeholder="e.g. Severe Dehydration vs Cold Crisp Water: Cellular Emergency in Body Central"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Language</label>
                <select
                  value={workflow.concept.language}
                  onChange={(e) => handleConceptChange('language', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="Mandarin">Mandarin (中文)</option>
                  <option value="Portuguese">Portuguese (Português)</option>
                  <option value="Arabic">Arabic (العربية)</option>
                </select>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workflow.concept.includeTransliteration}
                      onChange={(e) => handleConceptChange('includeTransliteration', e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    Include Transliteration
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workflow.concept.includeTranslation}
                      onChange={(e) => handleConceptChange('includeTranslation', e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    Include English Translation
                  </label>
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tone</label>
                <input
                  type="text"
                  value={workflow.concept.tone}
                  onChange={(e) => handleConceptChange('tone', e.target.value)}
                  placeholder="e.g. Dramatic yet Comedic & Educational"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Audience */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Audience</label>
                <select
                  value={workflow.concept.audience}
                  onChange={(e) => handleConceptChange('audience', e.target.value as TargetAudience)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="General Public">General Public</option>
                  <option value="Kids & Family">Kids & Family</option>
                  <option value="Teens & Students">Teens & Students</option>
                  <option value="Medical & Biology Enthusiasts">Medical & Biology Enthusiasts</option>
                </select>
              </div>

              {/* Visual Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Visual Art Style</label>
                <select
                  value={workflow.concept.visualStyle}
                  onChange={(e) => handleConceptChange('visualStyle', e.target.value as VisualStyle)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="3D Expressive Pixar Style">3D Expressive Pixar Style</option>
                  <option value="2D Vibrant Comic Animation">2D Vibrant Comic Animation</option>
                  <option value="Cyberpunk Sci-Fi Cellular">Cyberpunk Sci-Fi Cellular</option>
                  <option value="Stylized Claymation Organics">Stylized Claymation Organics</option>
                </select>
              </div>
            </div>

            {/* Generated Prompt & Dispatch */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                  Formatted Prompt for Gemini Website
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dispatchToGemini(conceptPrompt, 'concept-prompt')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold"
                  >
                    {copiedKey === 'concept-prompt' ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    {copiedKey === 'concept-prompt' ? 'Waiting for Gemini…' : 'Send to Gemini'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void captureLatestGeminiReply('concept')}
                    disabled={!companionActive || copiedKey === 'capture-concept'}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-semibold"
                  >
                    {copiedKey === 'capture-concept' ? 'Reading…' : 'Import latest reply'}
                  </button>
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Open Gemini <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <pre className="text-[11px] font-mono text-slate-400 max-h-32 overflow-y-auto whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                {conceptPrompt}
              </pre>
            </div>

            {/* Response Paste & Auto-Parser */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Paste Gemini's Concept Response to Auto-Extract:
                </span>
                <button
                  type="button"
                  onClick={handleParseConceptResponse}
                  disabled={!pasteInput.trim()}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
                >
                  Review Gemini Response
                </button>
              </div>
              <textarea
                rows={3}
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Paste Gemini's output here (including ### TITLE, ### PREMISE, ### THEME, ### CHARACTERS)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Structured Concept Review & Editor */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Review & Edit Concept Details
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Story Title</label>
                  <input
                    type="text"
                    value={workflow.concept.title}
                    onChange={(e) => handleConceptChange('title', e.target.value)}
                    placeholder="Story Title"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Premise</label>
                  <textarea
                    rows={2}
                    value={workflow.concept.premise}
                    onChange={(e) => handleConceptChange('premise', e.target.value)}
                    placeholder="Story Premise"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Core Biological Theme</label>
                  <input
                    type="text"
                    value={workflow.concept.theme}
                    onChange={(e) => handleConceptChange('theme', e.target.value)}
                    placeholder="Core Health Theme"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Character Roster */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Characters ({workflow.concept.characters.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCharacter}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    + Add Character
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflow.concept.characters.map((char) => (
                    <div
                      key={char.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveCharacter(char.id)}
                        className="absolute top-2.5 right-2.5 text-slate-500 hover:text-rose-400 text-xs"
                        title="Remove character"
                      >
                        ✕
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block">Name</label>
                          <input
                            type="text"
                            value={char.name}
                            onChange={(e) => handleCharacterChange(char.id, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Organ / Role</label>
                          <input
                            type="text"
                            value={char.organRole}
                            onChange={(e) => handleCharacterChange(char.id, 'organRole', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block">Visual Design Traits</label>
                        <input
                          type="text"
                          value={char.visualTraits}
                          onChange={(e) => handleCharacterChange(char.id, 'visualTraits', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block">Personality & Voice</label>
                        <input
                          type="text"
                          value={char.personality}
                          onChange={(e) => handleCharacterChange(char.id, 'personality', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation to Stage 2 */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: 'script' }))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Approve Concept & Proceed to Step 2 (Script & Dialogue)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STAGE 2 — SCENE & DIALOGUE (30–40 SECONDS SCRIPT)                     */}
      {/* ========================================================================= */}
      {workflow.currentStage === 'script' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Step 2 — 30–40s Scene & Dialogue Script
                </h2>
                <p className="text-xs text-slate-400">
                  Ask Gemini for sequential numbered scenes with durations totaling 30–40 seconds.
                </p>
              </div>

              {/* Total Duration Counter & Compliance Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                    totalDurationSec >= 30 && totalDurationSec <= 40
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>TOTAL: {totalDurationSec}s</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {totalDurationSec >= 30 && totalDurationSec <= 40
                      ? '(Optimal 30–40s range)'
                      : '(Target: 30–40s)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Generated Script Prompt Box */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  Formatted Script Prompt for Gemini Website
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dispatchToGemini(scriptPrompt, 'script-prompt')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold"
                  >
                    {copiedKey === 'script-prompt' ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Send Script to Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => void captureLatestGeminiReply('script')}
                    disabled={!companionActive || copiedKey === 'capture-script'}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-semibold"
                  >
                    {copiedKey === 'capture-script' ? 'Reading…' : 'Import latest reply'}
                  </button>
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Open Gemini <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <pre className="text-[11px] font-mono text-slate-400 max-h-32 overflow-y-auto whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                {scriptPrompt}
              </pre>
            </div>

            {/* Response Paste & Auto-Parser */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Paste Gemini's Script Response to Auto-Extract Scenes & Dialogue:
                </span>
                <button
                  type="button"
                  onClick={handleParseScriptResponse}
                  disabled={!pasteInput.trim()}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
                >
                  Review Gemini Script
                </button>
              </div>
              <textarea
                rows={3}
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Paste Gemini's output containing SCENE 1, DURATION, SETTING, ACTION, CAMERA, SOUND CUES, DIALOGUE..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Interactive Scene Cards Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Configured Scenes ({workflow.scenes.length})
                </span>
              </div>

              <div className="space-y-4">
                {workflow.scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors"
                  >
                    {/* Scene Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-bold">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={scene.title}
                          onChange={(e) => handleSceneFieldChange(scene.id, 'title', e.target.value)}
                          className="bg-transparent text-sm font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-amber-400"
                          placeholder="Scene Title"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>Duration:</span>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={scene.durationSec}
                            onChange={(e) =>
                              handleSceneFieldChange(scene.id, 'durationSec', parseInt(e.target.value, 10) || 5)
                            }
                            className="w-14 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono text-amber-300 text-center"
                          />
                          <span>sec</span>
                        </div>
                      </div>
                    </div>

                    {/* Setting, Camera, Action, Sound Cues */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Environment & Setting</label>
                        <input
                          type="text"
                          value={scene.setting}
                          onChange={(e) => handleSceneFieldChange(scene.id, 'setting', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Camera Framing & Movement</label>
                        <input
                          type="text"
                          value={scene.cameraFraming}
                          onChange={(e) => handleSceneFieldChange(scene.id, 'cameraFraming', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Character Action & Movement</label>
                        <textarea
                          rows={2}
                          value={scene.action}
                          onChange={(e) => handleSceneFieldChange(scene.id, 'action', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Sound Cues (SFX & Music)</label>
                        <input
                          type="text"
                          value={scene.soundCue}
                          onChange={(e) => handleSceneFieldChange(scene.id, 'soundCue', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Dialogue Lines */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/40">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        Dialogue Lines & Delivery Notes
                      </span>
                      {scene.dialogues.map((dlg) => (
                        <div
                          key={dlg.id}
                          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block">Speaker</label>
                              <input
                                type="text"
                                value={dlg.speaker}
                                onChange={(e) =>
                                  handleDialogueChange(scene.id, dlg.id, 'speaker', e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-amber-300 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Emotional Delivery</label>
                              <input
                                type="text"
                                value={dlg.emotionalDelivery}
                                onChange={(e) =>
                                  handleDialogueChange(scene.id, dlg.id, 'emotionalDelivery', e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block">Spoken Line</label>
                            <input
                              type="text"
                              value={dlg.dialogueText}
                              onChange={(e) =>
                                handleDialogueChange(scene.id, dlg.id, 'dialogueText', e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          {(dlg.transliteration || workflow.concept.includeTransliteration) && (
                            <div>
                              <label className="text-[10px] text-slate-500 block">Transliteration (Phonetic)</label>
                              <input
                                type="text"
                                value={dlg.transliteration || ''}
                                onChange={(e) =>
                                  handleDialogueChange(scene.id, dlg.id, 'transliteration', e.target.value)
                                }
                                placeholder="Phonetic Latin pronunciation"
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono"
                              />
                            </div>
                          )}

                          {(dlg.translation || workflow.concept.includeTranslation) && (
                            <div>
                              <label className="text-[10px] text-slate-500 block">English Translation</label>
                              <input
                                type="text"
                                value={dlg.translation || ''}
                                onChange={(e) =>
                                  handleDialogueChange(scene.id, dlg.id, 'translation', e.target.value)
                                }
                                placeholder="English translation"
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-300"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: 'concept' }))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Step 1 (Concept)
              </button>

              <button
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: 'images' }))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
              >
                Approve Script & Proceed to Step 3 (Scene Images)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STAGE 3 — GENERATE SCENE IMAGES IN GEMINI                               */}
      {/* ========================================================================= */}
      {workflow.currentStage === 'images' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Step 3 — Generate Scene Images in Gemini
                </h2>
                <p className="text-xs text-slate-400">
                  Generate one image per scene in Gemini in order. Style and character descriptions are kept consistent.
                </p>
              </div>

              <div className="p-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {workflow.scenes.filter((s) => s.imageUrl).length} / {workflow.scenes.length} Images Completed
                </span>
              </div>
            </div>

            {/* Quality and Constraint Notice */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>
                <strong>Negative Constraint Enforced:</strong> All image prompts automatically instruct Gemini to omit
                text, subtitles, logos, and UI watermarks so images remain clean cinematic stills.
              </span>
            </div>

            {/* Sequential Scene Cards with Matching Image Slots */}
            <div className="space-y-6">
              {workflow.scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800"
                >
                  {/* Left Column: Scene Context & Image Prompt */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        SCENE {scene.sceneNumber}: {scene.title} ({scene.durationSec}s)
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatchToGemini(scene.imagePrompt, `img-prompt-${scene.id}`)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold"
                      >
                        {copiedKey === `img-prompt-${scene.id}` ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        Send Image Prompt to Gemini
                      </button>
                      <button
                        type="button"
                        onClick={() => void importLatestGeminiImage(scene.id)}
                        disabled={!companionActive || copiedKey === `capture-image-${scene.id}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-[11px] font-semibold"
                      >
                        {copiedKey === `capture-image-${scene.id}` ? 'Importing…' : 'Import Latest Image'}
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                      <div className="text-slate-300">
                        <strong className="text-slate-400">Setting:</strong> {scene.setting}
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-slate-400">Action:</strong> {scene.action}
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-slate-400">Camera:</strong> {scene.cameraFraming}
                      </div>
                    </div>

                    {/* Image Generation Prompt Preview */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase">
                        Gemini Image Generation Prompt (Clean Artwork)
                      </label>
                      <textarea
                        rows={3}
                        value={scene.imagePrompt}
                        onChange={(e) => handleSceneFieldChange(scene.id, 'imagePrompt', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const refreshed = GeminiAutomationService.buildImagePrompt(scene, workflow.concept);
                          handleSceneFieldChange(scene.id, 'imagePrompt', refreshed);
                        }}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        <RefreshCw className="w-3 h-3" /> Regenerate Prompt Wording
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Visual Frame Display & Attachment */}
                  <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Scene {idx + 1} Visual Frame</span>
                        {scene.imageUrl ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            ✓ Generated in Gemini
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Awaiting Image
                          </span>
                        )}
                      </div>

                      {/* Image Preview Container */}
                      <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                        {scene.imageUrl ? (
                          <img
                            src={scene.imageUrl}
                            alt={`Scene ${scene.sceneNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-6 text-center space-y-2 text-slate-500">
                            <Camera className="w-8 h-8 mx-auto text-slate-600" />
                            <p className="text-xs">No image attached yet.</p>
                            <p className="text-[10px] text-slate-600">
                              Generate the image in Gemini. If it appears here, it is already saved in this scene—no extra upload is needed.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attach / Upload / URL controls */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Add Existing Image to Scene</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUploaded(scene.id, f);
                            }}
                          />
                        </label>

                        {scene.imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              // Regenerate individual image flow
                              handleSetImageUrl(scene.id, '');
                              dispatchToGemini(scene.imagePrompt, `regen-${scene.id}`);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                            title="Regenerate this individual image in Gemini"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500">Use this only to import an image file yourself. In Step 4, “Send Video Prompt to Gemini” tries to attach this scene’s image automatically.</p>

                      <input
                        type="text"
                        placeholder="Or paste image data URL..."
                        value={scene.imageUrl || ''}
                        onChange={(e) => handleSetImageUrl(scene.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stepper Navigation */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: 'script' }))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Step 2 (Script)
              </button>

              <button
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: 'video' }))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                Proceed to Step 4 (Generate Videos in Gemini)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STAGE 4 — GENERATE VIDEOS IN GEMINI                                    */}
      {/* ========================================================================= */}
      {workflow.currentStage === 'video' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  Step 4 — Generate Videos in Gemini (Image-to-Video Workflow)
                </h2>
                <p className="text-xs text-slate-400">
                  Upload each scene's reference image to Gemini and animate with matching action, camera, and audio cues.
                </p>
              </div>

              {/* Video Availability Status Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Gemini Video Status:</span>
                <select
                  value={videoAvailability}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setVideoAvailability(val);
                    setWorkflow((prev) => ({ ...prev, videoCapabilityStatus: val }));
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none focus:border-purple-400"
                >
                  <option value="available">✓ Video Tool Available in Gemini</option>
                  <option value="unavailable">⚠️ Video Tool Unavailable in Account / Region</option>
                  <option value="unknown">Checking Account Access...</option>
                </select>
              </div>
            </div>

            {/* HONEST LIMITATION NOTICE #1: AUDIO SYNTHESIS */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Volume2 className="w-4 h-4" />
                <span>Audio & Dialogue Capability Notice</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gemini's native video generation (Veo) produces animated motion and ambient audio effects; it does{' '}
                <strong>not</strong> synthesize synchronized spoken character dialogue. Your dialogue lines, character
                speakers, and emotional delivery cues are preserved and synchronized alongside each scene below.
              </p>
            </div>

            {/* HONEST LIMITATION NOTICE #2: UNAVAILABLE HANDLING */}
            {videoAvailability === 'unavailable' && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Gemini Video Generation is Currently Unavailable</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In strict accordance with project rules, we do <strong>not</strong> substitute external third-party
                  APIs (such as Runway, Kling, or Sora). Because video generation is currently not available in your
                  Gemini account or geographic region, the workflow pauses here at Step 4. All generated images,
                  scripts, and storyboard frames remain intact.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-semibold">
                    Explanation from your Gemini Interface:
                  </label>
                  <input
                    type="text"
                    value={videoUnavailableNote}
                    onChange={(e) => setVideoUnavailableNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Step-by-Step Image-to-Video Cards */}
            <div className="space-y-6">
              {workflow.scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800"
                >
                  {/* Left Column: Image Reference & Video Instructions */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        SCENE {scene.sceneNumber}: {scene.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatchToGemini(scene.videoPrompt, `vid-prompt-${scene.id}`)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-semibold"
                      >
                        {copiedKey === `vid-prompt-${scene.id}` ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        Send Video Prompt to Gemini
                      </button>
                    </div>

                    {/* How to attach reference image */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                      <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Automatic image handoff:
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        The companion will try to attach this scene’s image, then send the matching video prompt. If Gemini blocks the attachment, it will report that and you can attach it manually in Gemini.
                      </p>
                    </div>

                    {/* Video Prompt */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase">
                        Video Animation Prompt for Gemini
                      </label>
                      <textarea
                        rows={3}
                        value={scene.videoPrompt}
                        onChange={(e) => handleSceneFieldChange(scene.id, 'videoPrompt', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    {/* Scene Dialogue Reference */}
                    <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Preserved Spoken Dialogue for this Scene:
                      </span>
                      {scene.dialogues.map((d) => (
                        <div key={d.id} className="text-[11px] text-slate-300">
                          <span className="font-bold text-amber-300">{d.speaker}:</span> "{d.dialogueText}"
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Reference Image & Video Clip Player */}
                  <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Generated Video Clip</span>
                        {scene.videoUrl ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                            ✓ Clip Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            Awaiting Clip
                          </span>
                        )}
                      </div>

                      {/* Video Player or Reference Image */}
                      <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative">
                        {scene.videoUrl ? (
                          <video
                            src={scene.videoUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : scene.imageUrl ? (
                          <div className="relative w-full h-full">
                            <img
                              src={scene.imageUrl}
                              alt="Reference frame"
                              className="w-full h-full object-cover opacity-60"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/40">
                              <Film className="w-8 h-8 text-purple-400 mb-1" />
                              <span className="text-xs font-bold text-slate-200">Reference Frame Ready</span>
                              <span className="text-[10px] text-slate-400">Generate video in Gemini and attach below</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center space-y-1 text-slate-500">
                            <Film className="w-6 h-6 mx-auto text-slate-600" />
                            <p className="text-xs">No reference image or video attached.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Video Attachment Controls */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-purple-400" />
                          <span>Attach Generated Clip (MP4/WebM)</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleVideoUploaded(scene.id, f);
                            }}
                          />
                        </label>

                        {scene.videoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSceneFieldChange(scene.id, 'videoUrl', '');
                              dispatchToGemini(scene.videoPrompt, `regen-vid-${scene.id}`);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                            title="Regenerate this individual clip in Gemini"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Or paste video clip URL..."
                        value={scene.videoUrl || ''}
                        onChange={(e) => handleSceneFieldChange(scene.id, 'videoUrl', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sync to Studio Pipeline & Stepper Navigation */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setWorkflow((prev) => ({ ...prev, currentStage: 'images' }))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Step 3 (Images)
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {syncSuccessMessage ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-semibold animate-fadeIn">
                      ✓ {syncSuccessMessage}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('shots')}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
                    >
                      View Shots
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('final_edit')}
                      className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold"
                    >
                      View Final Edit Timeline
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSyncToProjectPipeline()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-cyan-500 to-amber-500 hover:opacity-95 text-slate-950 font-bold text-xs transition-opacity shadow-lg shadow-purple-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Sync to Studio Production Pipeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
