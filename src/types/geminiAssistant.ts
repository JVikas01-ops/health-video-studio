import type { TargetAudience, VisualStyle } from './index';

export type GeminiStage = 'concept' | 'script' | 'images' | 'video';

export interface GeminiCharacterBrief {
  id: string;
  name: string;
  organRole: string;
  visualTraits: string;
  personality: string;
  voiceNote?: string;
}

export interface GeminiConcept {
  topic: string;
  language: string;
  includeTransliteration: boolean;
  includeTranslation: boolean;
  tone: string;
  audience: TargetAudience;
  visualStyle: VisualStyle;
  title: string;
  premise: string;
  theme: string;
  characters: GeminiCharacterBrief[];
  isApproved: boolean;
  lastEditedAt?: string;
  isSampleContent?: boolean;
}

export interface GeminiDialogueItem {
  id: string;
  speaker: string;
  emotionalDelivery: string;
  dialogueText: string;
  transliteration?: string;
  translation?: string;
}

export interface GeminiSceneItem {
  id: string;
  sceneNumber: number;
  title: string;
  durationSec: number;
  setting: string;
  action: string;
  cameraFraming: string;
  soundCue: string;
  dialogues: GeminiDialogueItem[];
  characterNames: string[];
  imagePrompt: string;
  imageUrl?: string;
  imageStatus: 'idle' | 'prompt_ready' | 'generating' | 'completed' | 'failed';
  imageRejectionReason?: string;
  videoPrompt: string;
  videoUrl?: string;
  videoStatus: 'idle' | 'prompt_ready' | 'generating' | 'completed' | 'unavailable' | 'failed';
  videoUnavailableReason?: string;
  needsReview?: boolean;
}

export interface GeminiWorkflowProject {
  id: string;
  currentStage: GeminiStage;
  concept: GeminiConcept;
  scenes: GeminiSceneItem[];
  totalDurationSec: number;
  isScriptApproved: boolean;
  upstreamModified: boolean;
  videoCapabilityStatus: 'unknown' | 'available' | 'unavailable';
  videoCapabilityMessage?: string;
  createdAt: string;
  updatedAt: string;
}
