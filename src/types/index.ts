export type OrganType = 'brain' | 'heart' | 'lungs' | 'stomach' | 'liver' | 'kidneys' | 'other';

export interface CharacterPose {
  id: string;
  name: string;
  expression: 'neutral' | 'happy' | 'excited' | 'panicked' | 'exhausted' | 'thinking' | 'proud' | 'confused';
  description: string;
  imageUrl: string; // base64 or URL
  isDefault?: boolean;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  organType: OrganType;
  colorBadge: string;
  personality: string;
  voiceProfile: {
    voiceType: string;
    pitch: string;
    speakingRate: string;
    description: string;
  };
  promptConsistencyPrefix: string;
  poses: CharacterPose[];
}

// Reusable standard approval states
export type ApprovalStatus = 'draft' | 'awaiting_approval' | 'approved' | 'rejected' | 'needs_revision';

// Legacy status compatibility type
export type ShotStatus = 'planned' | 'in_progress' | 'generated' | 'approved';

export interface ApprovalHistoryItem {
  id: string;
  status: ApprovalStatus;
  timestamp: string;
  reviewerNotes?: string;
  previousStatus?: ApprovalStatus;
  actor?: 'human_reviewer' | 'system' | 'creator';
}

export type GenerationProviderType = 'local_engine' | 'gemini' | 'openai' | 'elevenlabs' | 'runway' | 'replicate';
export type GenerationJobStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'failed';

export interface ImageCandidate {
  id: string;
  shotId: string;
  variationIndex: number; // 0 for single, or 1, 2, 3, 4 for variations
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalHistoryItem[];
  createdAt: string;
  isApprovedReference?: boolean;
  rejectionReason?: string;
  metadata?: {
    provider: GenerationProviderType;
    model?: string;
    seed?: number;
    aspectRatio?: string;
    generationMode?: 'single' | 'variations';
  };
}

export interface VideoCandidate {
  id: string;
  shotId: string;
  takeNumber: number; // 1, 2, 3...
  videoUrl: string;
  prompt: string;
  referenceImageId?: string; // Pointer to approved ImageCandidate
  referenceImageUrl?: string;
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalHistoryItem[];
  durationSec: number;
  createdAt: string;
  isApprovedTake?: boolean;
  rejectionReason?: string;
  metadata?: {
    provider: GenerationProviderType;
    model?: string;
    fps?: number;
    motionIntensity?: number;
  };
}

export interface AudioCandidate {
  id: string;
  targetType: 'dialogue' | 'narration' | 'sfx' | 'bgm';
  targetId: string;
  audioUrl: string;
  prompt?: string;
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalHistoryItem[];
  durationSec?: number;
  createdAt: string;
  isApprovedTrack?: boolean;
  metadata?: {
    voiceId?: string;
    provider?: GenerationProviderType;
    format?: string;
  };
}

export interface ScriptApproval {
  status: ApprovalStatus;
  history: ApprovalHistoryItem[];
  notes?: string;
  lastReviewedAt?: string;
}

export interface SceneApproval {
  status: ApprovalStatus;
  history: ApprovalHistoryItem[];
  notes?: string;
  lastReviewedAt?: string;
  needsReview?: boolean; // Flagged when upstream script changes
  reviewReason?: string;
}

export interface FinalEditApproval {
  status: ApprovalStatus;
  history: ApprovalHistoryItem[];
  notes?: string;
  lastReviewedAt?: string;
  arrangedShotIds: string[]; // Order of approved shot IDs in timeline
  timelineDurations?: Record<string, number>; // Shot ID -> trimmed/adjusted duration
}

export type ShotType =
  | 'Extreme Wide Shot (EWS)'
  | 'Wide Shot (WS)'
  | 'Medium Shot (MS)'
  | 'Close-up (CU)'
  | 'Macro Extreme Close-up (ECU)'
  | 'Tracking Camera'
  | 'Dolly Zoom'
  | 'Point of View (POV)';

export interface ShotDialogue {
  id: string;
  characterId: string;
  characterName: string;
  line: string;
  audioPrompt?: string;
  audioUrl?: string; // transparent/local audio data URL or blob
  durationSec?: number;
  approvalStatus?: ApprovalStatus;
  approvalHistory?: ApprovalHistoryItem[];
  candidates?: AudioCandidate[];
}

export interface ShotSoundEffect {
  id: string;
  name: string;
  prompt?: string;
  audioUrl?: string;
  approvalStatus?: ApprovalStatus;
  approvalHistory?: ApprovalHistoryItem[];
  candidates?: AudioCandidate[];
}

export interface Shot {
  id: string;
  sceneId: string;
  order: number;
  shotCode: string; // e.g. "SC01-SH01"
  shotType: ShotType;
  cameraInstruction: string;
  description: string;
  characterIds: string[];
  dialogues: ShotDialogue[];
  imagePrompt: string;
  videoPrompt: string;

  // Explicit approval & change management
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalHistoryItem[];
  needsReview?: boolean; // Flagged if scene or script is modified
  reviewReason?: string;

  // Image Generation (Mode A: single, Mode B: variations)
  imageGenerationMode: 'single' | 'variations';
  imageCandidates: ImageCandidate[];
  approvedImageId?: string;

  // Video Generation Candidate Takes
  videoCandidates: VideoCandidate[];
  approvedVideoId?: string;

  // Legacy compatibility fields (kept synchronized)
  status: ShotStatus;
  attachedImageUrl?: string;
  attachedVideoUrl?: string;
  backgroundMusicTrack?: string;
  backgroundMusicApprovalStatus?: ApprovalStatus;
  soundEffects: ShotSoundEffect[];
  durationSec: number;
  notes?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  order: number;
  sceneNumber: number;
  title: string;
  environment: string;
  description: string;
  approval: SceneApproval; // Scene-level approval workflow
  shots: Shot[];
}

export type TargetAudience = 'Kids & Family' | 'Teens & Students' | 'General Public' | 'Medical & Biology Enthusiasts';
export type VisualStyle = '3D Expressive Pixar Style' | '2D Vibrant Comic Animation' | 'Cyberpunk Sci-Fi Cellular' | 'Stylized Claymation Organics';
export type ProjectStatus = 'Scripting' | 'Storyboarding' | 'Voice & Audio' | 'Shot Production' | 'Review & Approved';

export interface ProjectSettings {
  aspectRatio: '16:9' | '9:16' | '1:1';
  targetDurationMinutes: number;
  targetAudience: TargetAudience;
  visualStyle: VisualStyle;
  videoFps: 24 | 30 | 60;
  resolution: '1080p' | '4K';
}

export interface Project {
  id: string;
  title: string;
  topic: string;
  summary: string;
  status: ProjectStatus;
  scriptApproval: ScriptApproval; // Script approval gate
  finalEditApproval: FinalEditApproval; // Final edit approval gate
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  scenes: Scene[];
  characters: Character[];
}

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

export interface AISettings {
  scriptProvider: 'template_engine' | 'gemini' | 'openai';
  geminiConfig: AIProviderConfig;
  openaiConfig: AIProviderConfig;
  elevenlabsConfig: AIProviderConfig;
}

export * from './geminiAssistant';
