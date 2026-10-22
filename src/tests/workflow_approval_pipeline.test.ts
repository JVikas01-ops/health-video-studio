import { describe, it } from 'vitest';
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
  createApprovalRecord,
} from '../services/stageGating.ts';
import type { Project, Scene, Shot, ShotType, ApprovalStatus } from '../types/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

describe('Workflow Approval Pipeline Suite', () => {
  it('executes approval pipeline, candidate management, and gating tests', () => {

console.log('--- STARTING WORKFLOW APPROVAL PIPELINE TESTS ---');

// Setup mock test project
const mockShot: Shot = {
  id: 'shot-101',
  sceneId: 'scene-101',
  order: 1,
  shotCode: 'SC01-SH01',
  shotType: 'Medium Shot (MS)' as ShotType,
  cameraInstruction: 'Slow push in on Heart',
  description: 'Heart explains cardiac cycle',
  characterIds: ['char-heart'],
  dialogues: [
    {
      id: 'dlg-1',
      characterId: 'char-heart',
      characterName: 'Heart',
      line: 'Every beat pumps oxygen-rich blood across the entire vascular network!',
      audioPrompt: 'Enthusiastic and rhythmic tone',
      approvalStatus: 'draft',
    },
  ],
  imagePrompt: '3D Pixar style expressive Heart character pumping rhythmically',
  videoPrompt: 'Cinematic camera pushing into the Heart with subtle rhythmic organic pulsing',
  approvalStatus: 'draft',
  approvalHistory: [],
  imageGenerationMode: 'single',
  imageCandidates: [],
  videoCandidates: [],
  soundEffects: [
    {
      id: 'sfx-1',
      name: 'Heartbeat Thump',
      prompt: 'Low deep resonant heartbeat sound',
      approvalStatus: 'draft',
    },
  ],
  durationSec: 5,
  status: 'planned',
};

const mockScene: Scene = {
  id: 'scene-101',
  projectId: 'test-proj-pipeline',
  order: 1,
  sceneNumber: 1,
  title: 'The Great Circulatory Highway',
  environment: 'Vibrant interior of the left ventricle',
  description: 'Heart organ character stands on the muscular ventricular wall',
  approval: {
    status: 'draft',
    history: [],
  },
  shots: [mockShot],
};

const mockProject: Project = {
  id: 'test-proj-pipeline',
  title: 'Cardiovascular Adventures',
  topic: 'Human Heart and Circulation',
  summary: 'Heart and Lungs explain how cardiovascular circulation works',
  status: 'Draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    aspectRatio: '16:9',
    targetDurationMinutes: 1,
    targetAudience: 'Middle School Students',
    visualStyle: '3D Expressive Pixar Style',
    videoFps: 30,
    resolution: '1080p',
  },
  characters: [
    {
      id: 'char-heart',
      name: 'Heart',
      organType: 'heart',
      colorBadge: '#ef4444',
      personality: 'Rhythmic, passionate, relentless pump',
      voiceProfile: {
        voiceType: 'Baritone',
        pitch: 'Medium',
        speakingRate: 'Energetic',
        description: 'Warm and steady cadence',
      },
      promptConsistencyPrefix: 'Charming anthropomorphic 3D red heart with big expressive eyes',
      poses: [],
    },
  ],
  scenes: [mockScene],
  scriptApproval: {
    status: 'draft',
    history: [],
  },
  finalEditApproval: {
    status: 'draft',
    history: [],
    arrangedShotIds: ['shot-101'],
    timelineDurations: { 'shot-101': 5 },
  },
};

// TEST 1: Script & Scene Stage Gating
console.log('\n[TEST 1: Script & Scene Stage Gating]');
assert(
  !canProceedToScenePlanning(mockProject).eligible,
  'Stage Gate 1 blocks scene planning when script is in draft'
);

const scriptApprovedProject: Project = {
  ...mockProject,
  scriptApproval: {
    status: 'approved',
    history: [createApprovalRecord('approved', 'Script approved by medical reviewer', 'draft', 'human_reviewer')],
  },
};
assert(
  canProceedToScenePlanning(scriptApprovedProject).eligible,
  'Stage Gate 1 unlocks scene planning when script is approved'
);

assert(
  !canProceedToImageGeneration(mockScene, scriptApprovedProject).eligible,
  'Stage Gate 2 blocks image generation when scene is in draft'
);

const sceneApprovedScene: Scene = {
  ...mockScene,
  approval: {
    status: 'approved',
    history: [createApprovalRecord('approved', 'Scene staging approved', 'draft', 'human_reviewer')],
  },
};
assert(
  canProceedToImageGeneration(sceneApprovedScene, scriptApprovedProject).eligible,
  'Stage Gate 2 unlocks image generation when scene is approved'
);

// TEST 2: Image Generation Mode A (Single) & Mode B (Variations)
console.log('\n[TEST 2: Mode A (Single) & Mode B (Variations) Candidate Management]');
let testShot = { ...mockShot };

// Mode A: single generation
testShot = addImageCandidate(testShot, {
  imageUrl: 'data:image/png;base64,mode_a_frame',
  prompt: testShot.imagePrompt,
  variationIndex: 0,
  generationMode: 'single',
});
assert(testShot.imageCandidates.length === 1, 'Mode A candidate added');
assert(testShot.imageCandidates[0].variationIndex === 0, 'Mode A candidate index is 0');
assert(testShot.imageCandidates[0].approvalStatus === 'awaiting_approval', 'Candidate starts awaiting_approval');

// Mode B: multi-variation generation (e.g. 3 variations side-by-side)
for (let v = 1; v <= 3; v++) {
  testShot = addImageCandidate(testShot, {
    imageUrl: `data:image/png;base64,mode_b_variation_${v}`,
    prompt: testShot.imagePrompt,
    variationIndex: v,
    generationMode: 'variations',
  });
}
assert(testShot.imageCandidates.length === 4, 'Total 4 image candidates (1 single + 3 variations)');
assert(testShot.imageCandidates[1].variationIndex === 1, 'Variation 1 recorded');
assert(testShot.imageCandidates[2].variationIndex === 2, 'Variation 2 recorded');
assert(testShot.imageCandidates[3].variationIndex === 3, 'Variation 3 recorded');

// TEST 3: Image Approval, Locking Visual Reference & Candidate Immutability
console.log('\n[TEST 3: Image Approval & Visual Reference Locking]');
const selectedVariationId = testShot.imageCandidates[2].id; // Choose Variation 2
testShot = approveImageCandidate(testShot, selectedVariationId, 'Visual composition and lighting chosen as official reference');

assert(testShot.approvedImageId === selectedVariationId, 'approvedImageId locked to selected candidate');
assert(testShot.approvalStatus === 'approved', 'Shot approvalStatus updated to approved');
assert(testShot.attachedImageUrl === testShot.imageCandidates[2].imageUrl, 'attachedImageUrl synced');

const approvedCand = testShot.imageCandidates.find((c) => c.id === selectedVariationId);
assert(Boolean(approvedCand?.isApprovedReference), 'Candidate marked isApprovedReference: true');

// Verify immutability: generate a 5th candidate after approval
testShot = addImageCandidate(testShot, {
  imageUrl: 'data:image/png;base64,mode_a_regeneration_frame',
  prompt: testShot.imagePrompt,
  variationIndex: 4,
  generationMode: 'single',
});
assert(testShot.imageCandidates.length === 5, 'New candidate appended');
assert(testShot.approvedImageId === selectedVariationId, 'Approved reference remains locked to Variation 2');
assert(testShot.imageCandidates.find((c) => c.id === selectedVariationId)?.isApprovedReference === true, 'Approved candidate is not overwritten');

// Reject an alternative candidate
const rejectedCandId = testShot.imageCandidates[1].id;
testShot = rejectImageCandidate(testShot, rejectedCandId, 'Too dark; organ texture not clear');
assert(testShot.imageCandidates.find((c) => c.id === rejectedCandId)?.approvalStatus === 'rejected', 'Candidate marked rejected');
assert(testShot.imageCandidates.find((c) => c.id === rejectedCandId)?.rejectionReason === 'Too dark; organ texture not clear', 'Rejection reason persisted');

// TEST 4: Video Generation Gating & Candidate Takes
console.log('\n[TEST 4: Video Generation Gating & Candidate Takes]');
// Unapproved shot cannot proceed to video generation
const unapprovedShot = { ...mockShot, approvedImageId: undefined, attachedImageUrl: undefined, approvalStatus: 'draft' as ApprovalStatus };
const unapprovedScene = { ...sceneApprovedScene, shots: [unapprovedShot] };
assert(
  !canProceedToVideoGeneration(unapprovedShot, unapprovedScene, scriptApprovedProject).eligible,
  'Stage Gate 3 blocks video generation when shot lacks approved image reference'
);

// Approved shot can proceed
const approvedSceneWithShot = { ...sceneApprovedScene, shots: [testShot] };
assert(
  canProceedToVideoGeneration(testShot, approvedSceneWithShot, scriptApprovedProject).eligible,
  'Stage Gate 3 unlocks video generation when shot has approved image reference'
);

// Add Video Take 1
testShot = addVideoCandidate(testShot, {
  videoUrl: 'data:video/webm;base64,camera_push_in_take_1',
  prompt: testShot.videoPrompt,
  referenceImageId: testShot.approvedImageId,
  durationSec: 5,
  provider: 'local_engine',
});
assert(testShot.videoCandidates.length === 1, 'Video Take 1 added');
assert(testShot.videoCandidates[0].takeNumber === 1, 'Take number is 1');
assert(testShot.videoCandidates[0].approvalStatus === 'awaiting_approval', 'Generated video take is NOT auto-approved (mandate)');

// Add Video Take 2
testShot = addVideoCandidate(testShot, {
  videoUrl: 'data:video/webm;base64,camera_push_in_take_2',
  prompt: testShot.videoPrompt,
  referenceImageId: testShot.approvedImageId,
  durationSec: 5,
  provider: 'local_engine',
});
assert(testShot.videoCandidates.length === 2, 'Video Take 2 added without overwriting Take 1');
assert(testShot.videoCandidates[1].takeNumber === 2, 'Take number is 2');

// Human approval of Take 2
const take2Id = testShot.videoCandidates[1].id;
testShot = approveVideoCandidate(testShot, take2Id, 'Smooth camera motion; volumetric lighting verified');
assert(testShot.approvedVideoId === take2Id, 'approvedVideoId set to Take 2');
assert(testShot.videoCandidates.find((c) => c.id === take2Id)?.isApprovedTake === true, 'Take 2 marked isApprovedTake: true');
assert(testShot.videoCandidates.find((c) => c.id === testShot.videoCandidates[0].id)?.isApprovedTake !== true, 'Take 1 not marked approved take');

// Reject Take 1
const take1Id = testShot.videoCandidates[0].id;
testShot = rejectVideoCandidate(testShot, take1Id, 'Camera motion too rapid');
assert(testShot.videoCandidates.find((c) => c.id === take1Id)?.approvalStatus === 'rejected', 'Take 1 marked rejected');
assert(testShot.videoCandidates.find((c) => c.id === take1Id)?.rejectionReason === 'Camera motion too rapid', 'Rejection reason persisted');

// TEST 5: Final Edit Timeline Sequencer & Export Gate
console.log('\n[TEST 5: Final Edit Timeline Sequencer & Export Gate]');
const fullProjectWithApprovedTake: Project = {
  ...scriptApprovedProject,
  scenes: [
    {
      ...approvedSceneWithShot,
      shots: [testShot],
    },
  ],
};

assert(
  canProceedToFinalEdit(fullProjectWithApprovedTake).eligible,
  'Stage Gate 4/5 unlocks Final Edit Timeline when all shots have approved takes'
);

assert(
  !canExportProject(fullProjectWithApprovedTake).eligible,
  'Stage Gate 6 blocks master export before final human sign-off'
);

// Human Director approves the final edit
const finalApprovedProject: Project = {
  ...fullProjectWithApprovedTake,
  finalEditApproval: {
    status: 'approved',
    history: [
      createApprovalRecord(
        'approved',
        'Master sequence cut, pacing, and dialogue synchronization certified by Director',
        'draft',
        'human_reviewer'
      ),
    ],
    arrangedShotIds: ['shot-101'],
    timelineDurations: { 'shot-101': 5 },
    lastReviewedAt: new Date().toISOString(),
  },
};

assert(
  canExportProject(finalApprovedProject).eligible,
  'Stage Gate 6 unlocks master project export after final human sign-off'
);

    console.log('\n--- ALL WORKFLOW APPROVAL PIPELINE TESTS PASSED! ---');
  });
});
