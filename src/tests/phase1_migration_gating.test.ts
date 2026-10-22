import { describe, it } from 'vitest';
import { migrateProjectToApprovalSchema } from '../services/projectStorage.ts';
import {
  canProceedToScenePlanning,
  canProceedToImageGeneration,
  canProceedToVideoGeneration,
  canProceedToFinalEdit,
  canExportProject,
  addImageCandidate,
  approveImageCandidate,
  rejectImageCandidate,
  addVideoCandidate,
  approveVideoCandidate,
  rejectVideoCandidate,
  flagDependentAssetsForReview,
} from '../services/stageGating.ts';
import type { Project, Scene, Shot } from '../types/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

describe('Phase 1 Migration & Gating Suite', () => {
  it('executes phase 1 migration, stage gating, and candidate management tests', () => {
    console.log('--- STARTING PHASE 1 TESTS ---');

// TEST 1: Migration of legacy project data
console.log('\n[TEST 1: Legacy Project Migration]');
const legacyProjectData = {
  id: 'legacy-proj-1',
  title: 'Old Caffeine Project',
  topic: 'Caffeine & Adenosine',
  summary: 'Older project before approval workflow existed',
  status: 'Shot Production',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  settings: {
    aspectRatio: '16:9',
    targetDurationMinutes: 2,
    targetAudience: 'General Public',
    visualStyle: '3D Expressive Pixar Style',
    videoFps: 30,
    resolution: '1080p',
  },
  scenes: [
    {
      id: 'scene-1',
      projectId: 'legacy-proj-1',
      order: 1,
      sceneNumber: 1,
      title: 'Morning Rush',
      environment: 'Gastric Cavern',
      description: 'Coffee arrives',
      shots: [
        {
          id: 'shot-1-1',
          sceneId: 'scene-1',
          order: 1,
          shotCode: 'SC01-SH01',
          shotType: 'Wide Shot (WS)',
          cameraInstruction: 'Dolly zoom in',
          description: 'Chef Acidus reacting',
          characterIds: ['char-stomach'],
          dialogues: [
            {
              id: 'dlg-1',
              characterId: 'char-stomach',
              characterName: 'Chef Acidus',
              line: 'Hot coffee incoming!',
              audioUrl: 'data:audio/mp3;base64,AAA=',
            },
          ],
          imagePrompt: 'Chef Acidus in gastric chamber',
          videoPrompt: 'Camera zooms as coffee splashes',
          status: 'approved',
          attachedImageUrl: 'data:image/png;base64,LEGACY_IMAGE_DATA_1',
          attachedVideoUrl: 'data:video/mp4;base64,LEGACY_VIDEO_DATA_1',
          soundEffects: [],
          durationSec: 5,
        },
        {
          id: 'shot-1-2',
          sceneId: 'scene-1',
          order: 2,
          shotCode: 'SC01-SH02',
          shotType: 'Close-up (CU)',
          cameraInstruction: 'Pan',
          description: 'Caffeine enters blood',
          characterIds: ['char-stomach'],
          dialogues: [],
          imagePrompt: 'Caffeine crystals',
          videoPrompt: 'Crystals glow',
          status: 'planned',
          soundEffects: [],
          durationSec: 4,
        },
      ],
    },
  ],
  characters: [],
};

const migrated = migrateProjectToApprovalSchema(legacyProjectData);

assert(Boolean(migrated.scriptApproval), 'Script approval object was created');
assert(migrated.scriptApproval.status === 'approved', 'Status Shot Production mapped script to approved');
assert(migrated.scenes.length === 1, 'Scene count preserved');
assert(migrated.scenes[0].approval.status === 'approved', 'Scene 1 with approved shots marked as approved');

const migratedShot1 = migrated.scenes[0].shots[0];
assert(migratedShot1.approvalStatus === 'approved', 'Approved legacy shot has approvalStatus approved');
assert(migratedShot1.imageCandidates.length === 1, 'Legacy attachedImageUrl was wrapped into an ImageCandidate');
assert(migratedShot1.imageCandidates[0].imageUrl === 'data:image/png;base64,LEGACY_IMAGE_DATA_1', 'Legacy image URL matches');
assert(migratedShot1.imageCandidates[0].isApprovedReference === true, 'ImageCandidate marked as approved reference');
assert(migratedShot1.approvedImageId === migratedShot1.imageCandidates[0].id, 'approvedImageId pointers aligned');

assert(migratedShot1.videoCandidates.length === 1, 'Legacy attachedVideoUrl was wrapped into a VideoCandidate');
assert(migratedShot1.videoCandidates[0].videoUrl === 'data:video/mp4;base64,LEGACY_VIDEO_DATA_1', 'Legacy video URL matches');
assert(migratedShot1.videoCandidates[0].isApprovedTake === true, 'VideoCandidate marked as approved take');
assert(migratedShot1.approvedVideoId === migratedShot1.videoCandidates[0].id, 'approvedVideoId pointers aligned');

const migratedShot2 = migrated.scenes[0].shots[1];
assert(migratedShot2.approvalStatus === 'draft', 'Planned legacy shot has approvalStatus draft');
assert(migratedShot2.imageCandidates.length === 0, 'No candidate generated for empty attachedImageUrl');

// TEST 2: Stage Gating Validation
console.log('\n[TEST 2: Stage Gating Rules]');

// A: Script gating scene planning
const draftScriptProject: Project = {
  ...migrated,
  scriptApproval: {
    status: 'draft',
    history: [],
  },
};
const gate1Fail = canProceedToScenePlanning(draftScriptProject);
assert(!gate1Fail.eligible, 'canProceedToScenePlanning blocks when script is draft');

const gate1Pass = canProceedToScenePlanning(migrated);
assert(gate1Pass.eligible, 'canProceedToScenePlanning passes when script is approved');

// B: Scene gating image generation
const unapprovedScene: Scene = {
  ...migrated.scenes[0],
  approval: {
    status: 'draft',
    history: [],
  },
};
const gate2Fail = canProceedToImageGeneration(unapprovedScene, migrated);
assert(!gate2Fail.eligible, 'canProceedToImageGeneration blocks when scene is draft');

const gate2Pass = canProceedToImageGeneration(migrated.scenes[0], migrated);
assert(gate2Pass.eligible, 'canProceedToImageGeneration passes when scene is approved');

// C: Image gating video generation
const shotWithoutImage: Shot = {
  ...migratedShot2,
  imageCandidates: [],
  approvedImageId: undefined,
  attachedImageUrl: undefined,
};
const gate3Fail = canProceedToVideoGeneration(shotWithoutImage, migrated.scenes[0], migrated);
assert(!gate3Fail.eligible, 'canProceedToVideoGeneration blocks when shot has no approved image');

const gate3Pass = canProceedToVideoGeneration(migratedShot1, migrated.scenes[0], migrated);
assert(gate3Pass.eligible, 'canProceedToVideoGeneration passes when shot has approved image reference');

// D: Video gating final edit
const gate4Fail = canProceedToFinalEdit(migrated); // shot-1-2 is not approved
assert(!gate4Fail.eligible, 'canProceedToFinalEdit blocks when any shot lacks approved video');
assert(gate4Fail.unapprovedItems?.length === 1, 'Accurately identifies unapproved shot');

// E: Final edit gating export
const unapprovedFinalEditProj: Project = {
  ...migrated,
  finalEditApproval: {
    status: 'draft',
    history: [],
    arrangedShotIds: ['shot-1-1'],
  },
};
const gate5Fail = canExportProject(unapprovedFinalEditProj);
assert(!gate5Fail.eligible, 'canExportProject blocks when final edit is not approved');

const approvedFinalEditProj: Project = {
  ...migrated,
  finalEditApproval: {
    status: 'approved',
    history: [],
    arrangedShotIds: ['shot-1-1'],
  },
};
const gate5Pass = canExportProject(approvedFinalEditProj);
assert(gate5Pass.eligible, 'canExportProject passes when final edit is approved');

// TEST 3: Candidate Management & Immutability
console.log('\n[TEST 3: Candidate Management & Non-Destructive Regeneration]');
let workingShot: Shot = {
  ...migratedShot2,
  imageCandidates: [],
  videoCandidates: [],
};

// Add Variation 1
workingShot = addImageCandidate(workingShot, {
  imageUrl: 'data:image/png;base64,VAR_1',
  prompt: 'Variation 1 prompt',
  variationIndex: 1,
  generationMode: 'variations',
});
assert(workingShot.imageCandidates.length === 1, 'Variation 1 added');
assert(workingShot.imageCandidates[0].approvalStatus === 'awaiting_approval', 'Variation starts awaiting approval');

// Add Variation 2
workingShot = addImageCandidate(workingShot, {
  imageUrl: 'data:image/png;base64,VAR_2',
  prompt: 'Variation 2 prompt',
  variationIndex: 2,
  generationMode: 'variations',
});
assert(workingShot.imageCandidates.length === 2, 'Variation 2 added without overwriting Variation 1');

// Approve Variation 2
const var2Id = workingShot.imageCandidates[1].id;
workingShot = approveImageCandidate(workingShot, var2Id, 'Looks fantastic, approve');
assert(workingShot.approvedImageId === var2Id, 'approvedImageId points to Var 2');
assert(workingShot.imageCandidates[1].isApprovedReference === true, 'Var 2 marked as approved reference');
assert(workingShot.imageCandidates[0].imageUrl === 'data:image/png;base64,VAR_1', 'Var 1 preserved untouched');
assert(workingShot.attachedImageUrl === 'data:image/png;base64,VAR_2', 'Legacy attachedImageUrl synced');

// Generate Variation 3 AFTER approval (must NOT overwrite approved Var 2)
workingShot = addImageCandidate(workingShot, {
  imageUrl: 'data:image/png;base64,VAR_3',
  prompt: 'Variation 3 prompt',
  variationIndex: 3,
  generationMode: 'variations',
});
assert(workingShot.imageCandidates.length === 3, 'Variation 3 added');
assert(workingShot.approvedImageId === var2Id, 'Approved reference remains Var 2');
assert(workingShot.imageCandidates[1].isApprovedReference === true, 'Approved Var 2 remains approved');

// Reject Variation 1
const var1Id = workingShot.imageCandidates[0].id;
workingShot = rejectImageCandidate(workingShot, var1Id, 'Too blurry');
assert(workingShot.imageCandidates[0].approvalStatus === 'rejected', 'Var 1 marked as rejected');
assert(workingShot.imageCandidates[0].rejectionReason === 'Too blurry', 'Rejection reason recorded');

// Video candidate tests
workingShot = addVideoCandidate(workingShot, {
  videoUrl: 'data:video/mp4;base64,TAKE_1',
  prompt: 'Camera zooms in',
  referenceImageId: var2Id,
});
assert(workingShot.videoCandidates.length === 1, 'Video take 1 added');
assert(workingShot.videoCandidates[0].approvalStatus === 'awaiting_approval', 'Video take starts awaiting approval');

const take1Id = workingShot.videoCandidates[0].id;
workingShot = approveVideoCandidate(workingShot, take1Id, 'Dynamic camera move approved');
assert(workingShot.approvedVideoId === take1Id, 'approvedVideoId set to Take 1');
assert(workingShot.attachedVideoUrl === 'data:video/mp4;base64,TAKE_1', 'Legacy attachedVideoUrl synced');

workingShot = addVideoCandidate(workingShot, {
  videoUrl: 'data:video/mp4;base64,TAKE_2',
  prompt: 'Alternative camera angle',
  referenceImageId: var2Id,
});
assert(workingShot.videoCandidates.length === 2, 'Video take 2 added without overwriting Take 1');
assert(workingShot.approvedVideoId === take1Id, 'Take 1 remains approved');

const take2Id = workingShot.videoCandidates[1].id;
workingShot = rejectVideoCandidate(workingShot, take2Id, 'Motion too fast');
assert(workingShot.videoCandidates[1].approvalStatus === 'rejected', 'Take 2 rejected');
assert(workingShot.videoCandidates[1].rejectionReason === 'Motion too fast', 'Take 2 rejection recorded');

// TEST 4: Upstream Change Invalidation Cascade
console.log('\n[TEST 4: Upstream Change Invalidation Cascade]');
const projectBeforeScriptChange: Project = { ...migrated };
const projectAfterScriptChange = flagDependentAssetsForReview(
  projectBeforeScriptChange,
  'script',
  undefined,
  'Director revised scene dialogue'
);

assert(projectAfterScriptChange.scriptApproval.status === 'needs_revision', 'Script marked needs_revision');
assert(projectAfterScriptChange.scenes[0].approval.needsReview === true, 'Scene 1 flagged for review');
assert(projectAfterScriptChange.scenes[0].approval.reviewReason === 'Director revised scene dialogue', 'Review reason attached');
// Candidate assets are preserved!
assert(
  projectAfterScriptChange.scenes[0].shots[0].imageCandidates.length === 1,
  'Candidate assets preserved during upstream invalidation'
);

    console.log('\n--- ALL PHASE 1 TESTS PASSED SUCCESSFULLY! ---');
  });
});
