import type {
  Project,
  Scene,
  Shot,
  ApprovalStatus,
  ApprovalHistoryItem,
  ImageCandidate,
  VideoCandidate,
} from '../types';

/**
 * Creates an immutable approval audit record.
 */
export const createApprovalRecord = (
  status: ApprovalStatus,
  reviewerNotes?: string,
  previousStatus?: ApprovalStatus,
  actor: 'human_reviewer' | 'system' | 'creator' = 'human_reviewer'
): ApprovalHistoryItem => ({
  id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  status,
  timestamp: new Date().toISOString(),
  reviewerNotes: reviewerNotes || '',
  previousStatus,
  actor,
});

export interface GatingCheckResult {
  eligible: boolean;
  reason?: string;
  unapprovedItems?: string[];
}

/**
 * Stage 1 -> Stage 2 Gate:
 * Scene planning requires explicit Script Approval.
 */
export const canProceedToScenePlanning = (project: Project): GatingCheckResult => {
  if (!project.scriptApproval) {
    return {
      eligible: false,
      reason: 'Script approval record is missing. Please review and approve the script first.',
    };
  }

  if (project.scriptApproval.status !== 'approved') {
    return {
      eligible: false,
      reason: `Script status is "${project.scriptApproval.status}". Script must be explicitly approved before advancing to scene and shot planning.`,
    };
  }

  return { eligible: true };
};

/**
 * Stage 2 -> Stage 3 Gate:
 * Image generation for a shot requires its parent Scene to be explicitly approved.
 */
export const canProceedToImageGeneration = (
  scene: Scene,
  project: Project
): GatingCheckResult => {
  // First ensure script is approved
  const scriptGate = canProceedToScenePlanning(project);
  if (!scriptGate.eligible) {
    return scriptGate;
  }

  if (!scene.approval || scene.approval.status !== 'approved') {
    return {
      eligible: false,
      reason: `Scene ${scene.sceneNumber} (${scene.title}) is currently "${
        scene.approval?.status || 'draft'
      }". Scene must be approved by the director before generating visual image assets.`,
    };
  }

  if (scene.approval.needsReview) {
    return {
      eligible: false,
      reason: `Scene ${scene.sceneNumber} has been flagged for review: "${
        scene.approval.reviewReason || 'Upstream script was modified'
      }". Please review and re-approve the scene before generating images.`,
    };
  }

  return { eligible: true };
};

/**
 * Stage 3 -> Stage 4 Gate:
 * Video generation requires an explicitly Approved Image candidate to serve as the visual reference.
 */
export const canProceedToVideoGeneration = (
  shot: Shot,
  scene: Scene,
  project: Project
): GatingCheckResult & { approvedImage?: ImageCandidate } => {
  // First ensure scene is approved
  const sceneGate = canProceedToImageGeneration(scene, project);
  if (!sceneGate.eligible) {
    return sceneGate;
  }

  if (shot.needsReview) {
    return {
      eligible: false,
      reason: `Shot ${shot.shotCode} is flagged for review: "${
        shot.reviewReason || 'Scene was modified'
      }". Please review shot specifications before proceeding to video generation.`,
    };
  }

  const approvedCandidate = shot.imageCandidates?.find(
    (img) => img.id === shot.approvedImageId && img.approvalStatus === 'approved'
  );

  // Fallback check on attachedImageUrl for backwards compatibility if already approved
  if (!approvedCandidate && (!shot.attachedImageUrl || shot.approvalStatus !== 'approved')) {
    return {
      eligible: false,
      reason: `Shot ${shot.shotCode} does not have an approved image. An approved candidate image is required as the visual reference before video generation.`,
    };
  }

  return {
    eligible: true,
    approvedImage: approvedCandidate,
  };
};

/**
 * Stage 4/5 -> Stage 6 Gate:
 * Final Edit Timeline Assembly requires all shots to have approved video assets.
 */
export const canProceedToFinalEdit = (project: Project): GatingCheckResult => {
  const unapprovedShots: string[] = [];

  for (const scene of project.scenes) {
    for (const shot of scene.shots) {
      const hasApprovedVideo =
        (shot.approvedVideoId &&
          shot.videoCandidates?.some(
            (v) => v.id === shot.approvedVideoId && v.approvalStatus === 'approved'
          )) ||
        (shot.attachedVideoUrl && shot.approvalStatus === 'approved');

      if (!hasApprovedVideo) {
        unapprovedShots.push(`${shot.shotCode} (Scene ${scene.sceneNumber})`);
      }
    }
  }

  if (unapprovedShots.length > 0) {
    return {
      eligible: false,
      reason: `Cannot assemble final edit. ${unapprovedShots.length} shot(s) are missing approved video takes.`,
      unapprovedItems: unapprovedShots,
    };
  }

  return { eligible: true };
};

/**
 * Stage 6 -> Stage 7 Gate:
 * Project export requires human approval of the final edit.
 */
export const canExportProject = (project: Project): GatingCheckResult => {
  if (
    !project.finalEditApproval ||
    project.finalEditApproval.status !== 'approved'
  ) {
    return {
      eligible: false,
      reason: `Final Edit status is "${
        project.finalEditApproval?.status || 'draft'
      }". You must preview and approve the assembled final edit before export.`,
    };
  }

  return { eligible: true };
};

/**
 * Flags downstream assets for review when an upstream entity is modified.
 * Preserves all candidate images, videos, and audio without deleting them!
 */
export const flagDependentAssetsForReview = (
  project: Project,
  changedStage: 'script' | 'scene',
  sceneId?: string,
  reason?: string
): Project => {
  const timestamp = new Date().toISOString();

  if (changedStage === 'script') {
    // Flag all scenes and reset script status to needs_revision
    const updatedScenes = project.scenes.map((scene) => ({
      ...scene,
      approval: {
        ...scene.approval,
        needsReview: true,
        reviewReason: reason || 'Script was modified after previous approval',
        history: [
          ...scene.approval.history,
          createApprovalRecord(
            'needs_revision',
            reason || 'Script modified; scene review requested',
            scene.approval.status,
            'system'
          ),
        ],
      },
    }));

    return {
      ...project,
      scriptApproval: {
        ...project.scriptApproval,
        status: 'needs_revision',
        lastReviewedAt: timestamp,
        notes: reason || 'Script modified by creator',
        history: [
          ...project.scriptApproval.history,
          createApprovalRecord(
            'needs_revision',
            reason || 'Script edited; re-approval required',
            project.scriptApproval.status,
            'system'
          ),
        ],
      },
      scenes: updatedScenes,
    };
  } else if (changedStage === 'scene' && sceneId) {
    // Flag all shots inside that scene
    const updatedScenes = project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;

      const updatedShots = scene.shots.map((shot) => ({
        ...shot,
        needsReview: true,
        reviewReason: reason || 'Scene specifications were edited',
        approvalHistory: [
          ...shot.approvalHistory,
          createApprovalRecord(
            'needs_revision',
            reason || 'Parent scene modified',
            shot.approvalStatus,
            'system'
          ),
        ],
      }));

      return {
        ...scene,
        approval: {
          ...scene.approval,
          status: 'needs_revision' as ApprovalStatus,
          needsReview: true,
          reviewReason: reason || 'Scene edited; re-approval required',
          history: [
            ...scene.approval.history,
            createApprovalRecord(
              'needs_revision',
              reason || 'Scene edited',
              scene.approval.status,
              'system'
            ),
          ],
        },
        shots: updatedShots,
      };
    });

    return {
      ...project,
      scenes: updatedScenes,
    };
  }

  return project;
};

/**
 * Image Candidate Management:
 * Adds a new candidate without overwriting existing approved images.
 */
export const addImageCandidate = (
  shot: Shot,
  candidateData: {
    imageUrl: string;
    prompt: string;
    variationIndex?: number;
    provider?: 'local_engine' | 'gemini' | 'openai' | 'replicate';
    model?: string;
    generationMode?: 'single' | 'variations';
  }
): Shot => {
  const newId = `img-cand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  const newCandidate: ImageCandidate = {
    id: newId,
    shotId: shot.id,
    variationIndex: candidateData.variationIndex ?? shot.imageCandidates.length,
    imageUrl: candidateData.imageUrl,
    prompt: candidateData.prompt,
    approvalStatus: 'awaiting_approval',
    approvalHistory: [createApprovalRecord('awaiting_approval', 'Generated new candidate', undefined, 'system')],
    createdAt: timestamp,
    metadata: {
      provider: candidateData.provider || 'local_engine',
      model: candidateData.model || 'Standard 3D Organ Model',
      generationMode: candidateData.generationMode || 'single',
    },
  };

  return {
    ...shot,
    imageCandidates: [...shot.imageCandidates, newCandidate],
  };
};

/**
 * Approves an image candidate.
 * Marks candidate as approved, sets shot.approvedImageId, and updates legacy attachedImageUrl.
 * Preserves all alternative candidates.
 */
export const approveImageCandidate = (
  shot: Shot,
  candidateId: string,
  reviewerNotes?: string
): Shot => {
  const target = shot.imageCandidates.find((c) => c.id === candidateId);
  if (!target) return shot;

  const updatedCandidates = shot.imageCandidates.map((c) => {
    if (c.id === candidateId) {
      return {
        ...c,
        approvalStatus: 'approved' as ApprovalStatus,
        isApprovedReference: true,
        approvalHistory: [
          ...c.approvalHistory,
          createApprovalRecord('approved', reviewerNotes || 'Approved visual reference for video generation', c.approvalStatus),
        ],
      };
    }
    // Demote any previously approved reference to regular candidate without deleting
    return {
      ...c,
      isApprovedReference: false,
    };
  });

  return {
    ...shot,
    imageCandidates: updatedCandidates,
    approvedImageId: candidateId,
    attachedImageUrl: target.imageUrl, // sync legacy field
    approvalStatus: 'approved',
    approvalHistory: [
      ...shot.approvalHistory,
      createApprovalRecord('approved', `Image candidate approved: ${candidateId}`, shot.approvalStatus),
    ],
  };
};

/**
 * Rejects an image candidate with a reason.
 */
export const rejectImageCandidate = (
  shot: Shot,
  candidateId: string,
  reason: string
): Shot => {
  const updatedCandidates = shot.imageCandidates.map((c) => {
    if (c.id === candidateId) {
      return {
        ...c,
        approvalStatus: 'rejected' as ApprovalStatus,
        isApprovedReference: false,
        rejectionReason: reason,
        approvalHistory: [
          ...c.approvalHistory,
          createApprovalRecord('rejected', reason, c.approvalStatus),
        ],
      };
    }
    return c;
  });

  const wasApproved = shot.approvedImageId === candidateId;

  return {
    ...shot,
    imageCandidates: updatedCandidates,
    approvedImageId: wasApproved ? undefined : shot.approvedImageId,
    attachedImageUrl: wasApproved ? undefined : shot.attachedImageUrl,
  };
};

/**
 * Video Candidate Management:
 * Adds a new video candidate take.
 */
export const addVideoCandidate = (
  shot: Shot,
  videoData: {
    videoUrl: string;
    prompt: string;
    referenceImageId?: string;
    referenceImageUrl?: string;
    durationSec?: number;
    provider?: 'local_engine' | 'runway' | 'replicate';
  }
): Shot => {
  const newId = `vid-cand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();
  const takeNumber = (shot.videoCandidates?.length || 0) + 1;

  const newCandidate: VideoCandidate = {
    id: newId,
    shotId: shot.id,
    takeNumber,
    videoUrl: videoData.videoUrl,
    prompt: videoData.prompt,
    referenceImageId: videoData.referenceImageId || shot.approvedImageId,
    referenceImageUrl: videoData.referenceImageUrl || shot.attachedImageUrl,
    approvalStatus: 'awaiting_approval',
    approvalHistory: [createApprovalRecord('awaiting_approval', `Generated Take #${takeNumber}`, undefined, 'system')],
    durationSec: videoData.durationSec || shot.durationSec,
    createdAt: timestamp,
    metadata: {
      provider: videoData.provider || 'local_engine',
    },
  };

  return {
    ...shot,
    videoCandidates: [...(shot.videoCandidates || []), newCandidate],
  };
};

/**
 * Approves a video candidate take.
 */
export const approveVideoCandidate = (
  shot: Shot,
  candidateId: string,
  reviewerNotes?: string
): Shot => {
  const target = shot.videoCandidates?.find((c) => c.id === candidateId);
  if (!target) return shot;

  const updatedCandidates = shot.videoCandidates.map((c) => {
    if (c.id === candidateId) {
      return {
        ...c,
        approvalStatus: 'approved' as ApprovalStatus,
        isApprovedTake: true,
        approvalHistory: [
          ...c.approvalHistory,
          createApprovalRecord('approved', reviewerNotes || 'Approved take for final edit', c.approvalStatus),
        ],
      };
    }
    return {
      ...c,
      isApprovedTake: false,
    };
  });

  return {
    ...shot,
    videoCandidates: updatedCandidates,
    approvedVideoId: candidateId,
    attachedVideoUrl: target.videoUrl, // sync legacy field
    status: 'approved',
    approvalStatus: 'approved',
  };
};

/**
 * Rejects a video candidate take.
 */
export const rejectVideoCandidate = (
  shot: Shot,
  candidateId: string,
  reason: string
): Shot => {
  const updatedCandidates = (shot.videoCandidates || []).map((c) => {
    if (c.id === candidateId) {
      return {
        ...c,
        approvalStatus: 'rejected' as ApprovalStatus,
        isApprovedTake: false,
        rejectionReason: reason,
        approvalHistory: [
          ...c.approvalHistory,
          createApprovalRecord('rejected', reason, c.approvalStatus),
        ],
      };
    }
    return c;
  });

  const wasApproved = shot.approvedVideoId === candidateId;

  return {
    ...shot,
    videoCandidates: updatedCandidates,
    approvedVideoId: wasApproved ? undefined : shot.approvedVideoId,
    attachedVideoUrl: wasApproved ? undefined : shot.attachedVideoUrl,
  };
};
