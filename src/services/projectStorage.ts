import { get, set, del } from 'idb-keyval';
import type {
  Project,
  Scene,
  Shot,
  ImageCandidate,
  VideoCandidate,
  ApprovalStatus,
} from '../types';
import { getDefaultCharacters } from '../data/defaultCharacters';
import { buildProjectFromTemplate } from '../data/storyTemplates';
import { createApprovalRecord } from './stageGating';

const PROJECTS_LIST_KEY = 'hvs_projects_list_v1';
const PROJECT_PREFIX = 'hvs_project_data_';

/**
 * Migrates a legacy or partially defined project to the complete approval-driven schema.
 * Preserves all existing data, media URLs, and settings without loss.
 */
export const migrateProjectToApprovalSchema = (raw: any): Project => {
  if (!raw || typeof raw !== 'object') {
    return createDefaultInitialProject();
  }

  const projectId = raw.id || `proj-${Date.now()}`;
  const createdAt = raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updatedAt || new Date().toISOString();

  // Determine sensible initial script approval status
  const rawScriptStatus: ApprovalStatus =
    raw.scriptApproval?.status ||
    (raw.status === 'Shot Production' || raw.status === 'Review & Approved'
      ? 'approved'
      : 'draft');

  const scriptApproval = {
    status: rawScriptStatus,
    history: Array.isArray(raw.scriptApproval?.history)
      ? rawScriptStatus === 'approved' && raw.scriptApproval.history.length === 0
        ? [createApprovalRecord('approved', 'Auto-migrated legacy script', undefined, 'system')]
        : raw.scriptApproval.history
      : rawScriptStatus === 'approved'
      ? [createApprovalRecord('approved', 'Legacy project script migrated as approved', undefined, 'system')]
      : [],
    notes: raw.scriptApproval?.notes || '',
    lastReviewedAt: raw.scriptApproval?.lastReviewedAt || updatedAt,
  };

  // Safe migration of scenes and shots
  const rawScenes: any[] = Array.isArray(raw.scenes) ? raw.scenes : [];
  const scenes: Scene[] = rawScenes.map((scene, sIdx) => {
    const sceneId = scene.id || `scene-${projectId}-${sIdx + 1}`;
    const rawShots: any[] = Array.isArray(scene.shots) ? scene.shots : [];

    const shots: Shot[] = rawShots.map((shot, shIdx) => {
      const shotId = shot.id || `shot-${sceneId}-${shIdx + 1}`;
      const shotStatus = shot.status || 'planned';

      // Map legacy status to approvalStatus
      const approvalStatus: ApprovalStatus =
        shot.approvalStatus ||
        (shotStatus === 'approved'
          ? 'approved'
          : shotStatus === 'generated'
          ? 'awaiting_approval'
          : 'draft');

      const approvalHistory = Array.isArray(shot.approvalHistory) ? shot.approvalHistory : [];

      // Migrate existing attached image into imageCandidates if not present
      let imageCandidates: ImageCandidate[] = Array.isArray(shot.imageCandidates)
        ? [...shot.imageCandidates]
        : [];

      let approvedImageId: string | undefined = shot.approvedImageId;

      if (shot.attachedImageUrl && !imageCandidates.some((c) => c.imageUrl === shot.attachedImageUrl)) {
        const legacyImgId = `img-migrated-${shotId}`;
        const isApproved = approvalStatus === 'approved' || Boolean(shot.attachedVideoUrl);

        imageCandidates.unshift({
          id: legacyImgId,
          shotId,
          variationIndex: 0,
          imageUrl: shot.attachedImageUrl,
          prompt: shot.imagePrompt || '',
          approvalStatus: isApproved ? 'approved' : 'awaiting_approval',
          approvalHistory: [
            createApprovalRecord(
              isApproved ? 'approved' : 'awaiting_approval',
              'Preserved from legacy project state',
              undefined,
              'system'
            ),
          ],
          createdAt: shot.createdAt || createdAt,
          isApprovedReference: isApproved,
          metadata: {
            provider: 'local_engine',
            generationMode: 'single',
          },
        });

        if (isApproved && !approvedImageId) {
          approvedImageId = legacyImgId;
        }
      }

      // Migrate existing attached video into videoCandidates if not present
      let videoCandidates: VideoCandidate[] = Array.isArray(shot.videoCandidates)
        ? [...shot.videoCandidates]
        : [];

      let approvedVideoId: string | undefined = shot.approvedVideoId;

      if (shot.attachedVideoUrl && !videoCandidates.some((v) => v.videoUrl === shot.attachedVideoUrl)) {
        const legacyVidId = `vid-migrated-${shotId}`;
        const isApproved = approvalStatus === 'approved' || shotStatus === 'approved';

        videoCandidates.unshift({
          id: legacyVidId,
          shotId,
          takeNumber: 1,
          videoUrl: shot.attachedVideoUrl,
          prompt: shot.videoPrompt || '',
          referenceImageId: approvedImageId,
          referenceImageUrl: shot.attachedImageUrl,
          approvalStatus: isApproved ? 'approved' : 'awaiting_approval',
          approvalHistory: [
            createApprovalRecord(
              isApproved ? 'approved' : 'awaiting_approval',
              'Preserved from legacy project video take',
              undefined,
              'system'
            ),
          ],
          durationSec: shot.durationSec || 5,
          createdAt: shot.createdAt || createdAt,
          isApprovedTake: isApproved,
          metadata: {
            provider: 'local_engine',
          },
        });

        if (isApproved && !approvedVideoId) {
          approvedVideoId = legacyVidId;
        }
      }

      // Dialogues migration
      const rawDialogues: any[] = Array.isArray(shot.dialogues) ? shot.dialogues : [];
      const dialogues = rawDialogues.map((dlg, dIdx) => ({
        id: dlg.id || `dlg-${shotId}-${dIdx + 1}`,
        characterId: dlg.characterId || '',
        characterName: dlg.characterName || 'Character',
        line: dlg.line || '',
        audioPrompt: dlg.audioPrompt,
        audioUrl: dlg.audioUrl,
        durationSec: dlg.durationSec || 4,
        approvalStatus: (dlg.approvalStatus || (dlg.audioUrl ? 'approved' : 'draft')) as ApprovalStatus,
        approvalHistory: Array.isArray(dlg.approvalHistory) ? dlg.approvalHistory : [],
        candidates: Array.isArray(dlg.candidates) ? dlg.candidates : [],
      }));

      // Sound effects migration
      const rawSFX: any[] = Array.isArray(shot.soundEffects) ? shot.soundEffects : [];
      const soundEffects = rawSFX.map((sfx, sxIdx) => ({
        id: sfx.id || `sfx-${shotId}-${sxIdx + 1}`,
        name: sfx.name || 'SFX',
        prompt: sfx.prompt,
        audioUrl: sfx.audioUrl,
        approvalStatus: (sfx.approvalStatus || (sfx.audioUrl ? 'approved' : 'draft')) as ApprovalStatus,
        approvalHistory: Array.isArray(sfx.approvalHistory) ? sfx.approvalHistory : [],
        candidates: Array.isArray(sfx.candidates) ? sfx.candidates : [],
      }));

      return {
        id: shotId,
        sceneId,
        order: shot.order || shIdx + 1,
        shotCode: shot.shotCode || `SC0${sIdx + 1}-SH0${shIdx + 1}`,
        shotType: shot.shotType || 'Medium Shot (MS)',
        cameraInstruction: shot.cameraInstruction || 'Standard camera framing',
        description: shot.description || '',
        characterIds: Array.isArray(shot.characterIds) ? shot.characterIds : [],
        dialogues,
        imagePrompt: shot.imagePrompt || '',
        videoPrompt: shot.videoPrompt || '',
        approvalStatus,
        approvalHistory,
        needsReview: Boolean(shot.needsReview),
        reviewReason: shot.reviewReason,
        imageGenerationMode: shot.imageGenerationMode || 'single',
        imageCandidates,
        approvedImageId,
        videoCandidates,
        approvedVideoId,
        status: shotStatus,
        attachedImageUrl: shot.attachedImageUrl,
        attachedVideoUrl: shot.attachedVideoUrl,
        backgroundMusicTrack: shot.backgroundMusicTrack,
        soundEffects,
        durationSec: shot.durationSec || 5,
        notes: shot.notes,
      };
    });

    // Scene-level approval determination
    const sceneHasApprovedAssets = shots.some(
      (sh) => sh.approvalStatus === 'approved' || Boolean(sh.attachedImageUrl)
    );
    const rawSceneStatus: ApprovalStatus =
      scene.approval?.status || (sceneHasApprovedAssets ? 'approved' : 'draft');

    const approval = {
      status: rawSceneStatus,
      history: Array.isArray(scene.approval?.history)
        ? scene.approval.history
        : rawSceneStatus === 'approved'
        ? [createApprovalRecord('approved', 'Legacy scene preserved as approved', undefined, 'system')]
        : [],
      notes: scene.approval?.notes || '',
      lastReviewedAt: scene.approval?.lastReviewedAt || updatedAt,
      needsReview: Boolean(scene.approval?.needsReview),
      reviewReason: scene.approval?.reviewReason,
    };

    return {
      id: sceneId,
      projectId,
      order: scene.order || sIdx + 1,
      sceneNumber: scene.sceneNumber || sIdx + 1,
      title: scene.title || `Scene ${sIdx + 1}`,
      environment: scene.environment || 'Internal Cellular Environment',
      description: scene.description || '',
      approval,
      shots,
    };
  });

  // Final edit approval
  const allShotIds = scenes.flatMap((s) => s.shots.map((sh) => sh.id));
  const finalEditApproval = {
    status: (raw.finalEditApproval?.status || 'draft') as ApprovalStatus,
    history: Array.isArray(raw.finalEditApproval?.history) ? raw.finalEditApproval.history : [],
    notes: raw.finalEditApproval?.notes || '',
    lastReviewedAt: raw.finalEditApproval?.lastReviewedAt || updatedAt,
    arrangedShotIds: Array.isArray(raw.finalEditApproval?.arrangedShotIds)
      ? raw.finalEditApproval.arrangedShotIds
      : allShotIds,
    timelineDurations: raw.finalEditApproval?.timelineDurations || {},
  };

  const characters = Array.isArray(raw.characters) && raw.characters.length > 0
    ? raw.characters
    : getDefaultCharacters(projectId);

  const migratedProject: Project = {
    id: projectId,
    title: raw.title || 'Untitled Health Production',
    topic: raw.topic || 'Human Physiology',
    summary: raw.summary || '',
    status: raw.status || 'Scripting',
    scriptApproval,
    finalEditApproval,
    createdAt,
    updatedAt,
    settings: {
      aspectRatio: raw.settings?.aspectRatio || '16:9',
      targetDurationMinutes: raw.settings?.targetDurationMinutes || 3,
      targetAudience: raw.settings?.targetAudience || 'General Public',
      visualStyle: raw.settings?.visualStyle || '3D Expressive Pixar Style',
      videoFps: raw.settings?.videoFps || 30,
      resolution: raw.settings?.resolution || '1080p',
    },
    scenes,
    characters,
  };

  return migratedProject;
};

export const createDefaultInitialProject = (): Project => {
  const projectId = 'proj-caffeine-pilot';
  const characters = getDefaultCharacters(projectId);
  const storyData = buildProjectFromTemplate('caffeine-rush', projectId, characters);

  const initialProject: Project = {
    id: projectId,
    title: storyData.title,
    topic: storyData.topic,
    summary: storyData.summary,
    status: 'Shot Production',
    scriptApproval: {
      status: 'approved',
      history: [createApprovalRecord('approved', 'Initial pilot educational script approved', undefined, 'system')],
      lastReviewedAt: new Date().toISOString(),
    },
    finalEditApproval: {
      status: 'draft',
      history: [],
      arrangedShotIds: storyData.scenes.flatMap((s) => s.shots.map((sh) => sh.id)),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      aspectRatio: '16:9',
      targetDurationMinutes: 3,
      targetAudience: storyData.targetAudience,
      visualStyle: storyData.visualStyle,
      videoFps: 30,
      resolution: '1080p',
    },
    scenes: storyData.scenes.map((scene) => ({
      ...scene,
      approval: {
        status: 'approved',
        history: [createApprovalRecord('approved', 'Initial pilot scene specifications approved', undefined, 'system')],
      },
      shots: scene.shots.map((shot) => ({
        ...shot,
        approvalStatus: 'draft',
        approvalHistory: [],
        imageGenerationMode: 'single',
        imageCandidates: [],
        videoCandidates: [],
      })),
    })),
    characters,
  };

  return initialProject;
};

export const loadAllProjects = async (): Promise<Project[]> => {
  try {
    const projectIds = (await get<string[]>(PROJECTS_LIST_KEY)) || [];

    if (projectIds.length === 0) {
      // Initialize with default pilot project
      const pilot = createDefaultInitialProject();
      await saveProject(pilot);
      return [pilot];
    }

    const projects: Project[] = [];
    for (const id of projectIds) {
      const rawProj = await get<any>(`${PROJECT_PREFIX}${id}`);
      if (rawProj) {
        // Automatically migrate to new schema upon load
        const migrated = migrateProjectToApprovalSchema(rawProj);
        projects.push(migrated);
      }
    }

    if (projects.length === 0) {
      const pilot = createDefaultInitialProject();
      await saveProject(pilot);
      return [pilot];
    }

    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.warn('IndexedDB load error, checking localStorage fallback:', err);
    const raw = localStorage.getItem('hvs_fallback_projects');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(migrateProjectToApprovalSchema);
        }
      } catch (e) {
        console.error(e);
      }
    }
    const pilot = createDefaultInitialProject();
    return [pilot];
  }
};

export const saveProject = async (project: Project): Promise<void> => {
  try {
    const validatedProject = migrateProjectToApprovalSchema({
      ...project,
      updatedAt: new Date().toISOString(),
    });

    await set(`${PROJECT_PREFIX}${project.id}`, validatedProject);

    const projectIds = (await get<string[]>(PROJECTS_LIST_KEY)) || [];
    if (!projectIds.includes(project.id)) {
      projectIds.unshift(project.id);
      await set(PROJECTS_LIST_KEY, projectIds);
    }

    // Also update lightweight metadata in localStorage as backup
    try {
      localStorage.setItem('hvs_active_project_id', project.id);
    } catch {
      // ignore
    }
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
    // fallback
    try {
      localStorage.setItem(`hvs_fallback_${project.id}`, JSON.stringify(project));
    } catch {
      // ignore
    }
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    await del(`${PROJECT_PREFIX}${projectId}`);
    const projectIds = (await get<string[]>(PROJECTS_LIST_KEY)) || [];
    const updatedIds = projectIds.filter((id) => id !== projectId);
    await set(PROJECTS_LIST_KEY, updatedIds);
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
};

export const duplicateProject = async (source: Project): Promise<Project> => {
  const newId = `proj-${Date.now()}`;
  const clonedCharacters = source.characters.map((c) => ({
    ...c,
    id: `char-${c.organType}-${newId}`,
    projectId: newId,
  }));

  const charIdMap: Record<string, string> = {};
  source.characters.forEach((oldChar, idx) => {
    charIdMap[oldChar.id] = clonedCharacters[idx].id;
  });

  const clonedScenes = source.scenes.map((scene, sIdx) => {
    const newSceneId = `scene-${newId}-${sIdx + 1}`;
    const newShots = scene.shots.map((shot, shIdx) => {
      const newShotId = `shot-${newSceneId}-${shIdx + 1}`;
      return {
        ...shot,
        id: newShotId,
        sceneId: newSceneId,
        characterIds: shot.characterIds.map((cid) => charIdMap[cid] || cid),
        dialogues: shot.dialogues.map((dlg, dIdx) => ({
          ...dlg,
          id: `dlg-${newShotId}-${dIdx + 1}`,
          characterId: charIdMap[dlg.characterId] || dlg.characterId,
        })),
        soundEffects: shot.soundEffects.map((sfx, sxIdx) => ({
          ...sfx,
          id: `sfx-${newShotId}-${sxIdx + 1}`,
        })),
        imageCandidates: shot.imageCandidates.map((c) => ({
          ...c,
          id: `img-clone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          shotId: newShotId,
        })),
        videoCandidates: shot.videoCandidates.map((v) => ({
          ...v,
          id: `vid-clone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          shotId: newShotId,
        })),
      };
    });

    return {
      ...scene,
      id: newSceneId,
      projectId: newId,
      shots: newShots,
    };
  });

  const clonedProject: Project = migrateProjectToApprovalSchema({
    ...source,
    id: newId,
    title: `${source.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    characters: clonedCharacters,
    scenes: clonedScenes,
    finalEditApproval: {
      status: 'draft',
      history: [],
      arrangedShotIds: clonedScenes.flatMap((s) => s.shots.map((sh) => sh.id)),
    },
  });

  await saveProject(clonedProject);
  return clonedProject;
};

export const exportProjectToJson = (project: Project): void => {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_metadata.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importProjectFromJson = async (fileContent: string): Promise<Project> => {
  const parsed = JSON.parse(fileContent);
  if (!parsed || !parsed.title || !parsed.scenes) {
    throw new Error('Invalid project JSON file format.');
  }
  const migrated = migrateProjectToApprovalSchema(parsed);
  const newId = `proj-imported-${Date.now()}`;
  migrated.id = newId;
  migrated.updatedAt = new Date().toISOString();
  await saveProject(migrated);
  return migrated;
};
