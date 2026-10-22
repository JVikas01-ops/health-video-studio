import { describe, it, expect } from 'vitest';
import { GeminiAutomationService } from '../services/geminiAutomationService';
import { WATER_CRISIS_SAMPLE_PROJECT, CREATE_BLANK_GEMINI_PROJECT } from '../data/geminiSampleData';
import type { GeminiConcept, GeminiSceneItem } from '../types/geminiAssistant';

describe('Gemini Web Assistant — 4-Stage Creative Workflow Tests', () => {
  // Test 1: Concept Prompt Construction
  it('Step 1: Builds structured concept prompt with all parameters and format headers', () => {
    const concept: Partial<GeminiConcept> = {
      topic: 'How Coffee & Caffeine Affect Heart & Brain',
      language: 'English',
      tone: 'Dramatic yet Comedic',
      audience: 'General Public',
      visualStyle: '3D Expressive Pixar Style',
      includeTranslation: false,
    };

    const prompt = GeminiAutomationService.buildConceptPrompt(concept);
    expect(prompt).toContain('TOPIC / IDEA: "How Coffee & Caffeine Affect Heart & Brain"');
    expect(prompt).toContain('LANGUAGE: English');
    expect(prompt).toContain('VISUAL ART STYLE: 3D Expressive Pixar Style');
    expect(prompt).toContain('### TITLE');
    expect(prompt).toContain('### PREMISE');
    expect(prompt).toContain('### THEME');
    expect(prompt).toContain('### CHARACTERS');
  });

  // Test 2: Bilingual, Transliteration, and Translation Instructions
  it('Step 1 & 2: Supports non-English languages with transliteration and translation instructions', () => {
    const concept: Partial<GeminiConcept> = {
      topic: 'Dehydration Rescue',
      language: 'Hindi',
      includeTransliteration: true,
      includeTranslation: true,
      visualStyle: '3D Expressive Pixar Style',
    };

    const scriptPrompt = GeminiAutomationService.buildScriptPrompt(concept as GeminiConcept, 35);
    expect(scriptPrompt).toContain('Main Dialogue: Write dialogue in Hindi');
    expect(scriptPrompt).toContain('Transliteration: Provide Latin/English phonetic pronunciation');
    expect(scriptPrompt).toContain('Translation: Provide English translation');
  });

  // Test 3: Concept Response Parsing
  it('Step 1: Parses Gemini markdown response into title, premise, theme, and characters', () => {
    const mockGeminiOutput = `
### TITLE
The Great Cellular Flood: When Salt Meets Water

### PREMISE
On a sweltering summer day, blood salt concentrations trigger panic stations in Body Central. Dr. Synapse sounds alarms while the Nephron Duo desperately seal the dams until pure ice water cascades down the esophagus.

### THEME
Hydration maintains biological homeostasis; never ignore your body's urgent thirst signals.

### CHARACTERS
- **Dr. Synapse** | Organ/Role: Brain / Central Control | Personality: Anxious analyst | Visual: Glowing pink cortex with silver spectacles | Voice Note: Quick, high-speed
- **Captain Pulse** | Organ/Role: Heart / Circulation | Personality: Brave hero | Visual: Crimson heart with brass valves | Voice Note: Heroic baritone
- **The Nephron Duo** | Organ/Role: Kidneys / Filtration | Personality: Neurotic inspectors | Visual: Twin bean characters with moisture meters | Voice Note: High-pitched chirps
`;

    const parsed = GeminiAutomationService.parseConceptResponse(mockGeminiOutput);
    expect(parsed.title).toBe('The Great Cellular Flood: When Salt Meets Water');
    expect(parsed.premise).toContain('blood salt concentrations trigger panic');
    expect(parsed.theme).toContain('Hydration maintains biological homeostasis');
    expect(parsed.characters?.length).toBe(3);
    expect(parsed.characters?.[0].name).toBe('Dr. Synapse');
    expect(parsed.characters?.[1].name).toBe('Captain Pulse');
    expect(parsed.characters?.[2].name).toBe('The Nephron Duo');
  });

  // Test 4: Script Prompt Strict Duration Enforcing (30–40 Seconds)
  it('Step 2: Script prompt strictly enforces 30–40 second total target duration', () => {
    const concept = WATER_CRISIS_SAMPLE_PROJECT.concept;
    const prompt = GeminiAutomationService.buildScriptPrompt(concept, 36);

    expect(prompt).toContain('Total script duration MUST be between 30 and 40 seconds');
    expect(prompt).toContain('Current target duration: 36 seconds');
    expect(prompt).toContain('SCENE 1: [Scene Title]');
    expect(prompt).toContain('DURATION:');
    expect(prompt).toContain('SETTING:');
    expect(prompt).toContain('ACTION:');
    expect(prompt).toContain('CAMERA:');
    expect(prompt).toContain('SOUND CUES:');
    expect(prompt).toContain('DIALOGUE:');
  });

  // Test 5: Script Response Parsing into Numbered Scenes
  it('Step 2: Parses Gemini script output into scenes with setting, camera, cues, and dialogue', () => {
    const mockScriptOutput = `
SCENE 1: The Parched Cerebral Alarm
DURATION: 9 seconds
SETTING: Arid neural cavern with flickering amber crystals
ACTION: Dr. Synapse furiously taps glowing holographic readouts as salinity alarms flash.
CAMERA: Wide Shot (WS) with slow dolly push-in toward console
SOUND CUES: SFX: High-frequency ping alarm; Music: Tense ticking clock
DIALOGUE:
- SPEAKER: Dr. Synapse | EMOTION: Alarmed and breathless
  LINE: "Blood salinity is up 15%! We are throwing synaptic sparks everywhere!"
- SPEAKER: Captain Pulse | EMOTION: Straining with effort
  LINE: "Blood volume is dropping fast, Doc! Viscosity is like pumping wet sand!"

SCENE 2: The Renal Vault Lockdown
DURATION: 11 seconds
SETTING: Nephron Filtration Chamber with serpentine glass coils
ACTION: The Nephron Duo slam emergency hydraulic levers to stop all fluid outflow.
CAMERA: Medium Close-up (MCU) with low-angle framing
SOUND CUES: SFX: Heavy hydraulic valve clamp; Music: Fast comedic tension
DIALOGUE:
- SPEAKER: The Nephron Duo | EMOTION: Panicky in unison
  LINE: "Lockdown active! Not one single drop leaves this chamber until fresh water arrives!"

SCENE 3: The Cold Water Splashdown
DURATION: 16 seconds
SETTING: Luminous cellular plaza flooded with crystalline blue water waves
ACTION: A waterfall of pure cold water washes over the organs who cheer in relief.
CAMERA: Extreme Wide Shot (EWS) crane up into triumphant celebration
SOUND CUES: SFX: Huge refreshing splash; Music: Triumphant upbeat fanfare
DIALOGUE:
- SPEAKER: Dr. Synapse | EMOTION: Exhilarated and victorious
  LINE: "Osmotic pressure normalized! Synapses firing at full capacity!"
`;

    const { scenes, totalDurationSec } = GeminiAutomationService.parseScriptResponse(
      mockScriptOutput,
      WATER_CRISIS_SAMPLE_PROJECT.concept
    );

    expect(scenes.length).toBe(3);
    expect(totalDurationSec).toBe(36); // 9 + 11 + 16 = 36 seconds (strictly in 30–40s range!)
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].title).toBe('The Parched Cerebral Alarm');
    expect(scenes[0].durationSec).toBe(9);
    expect(scenes[0].cameraFraming).toContain('Wide Shot (WS)');
    expect(scenes[0].dialogues.length).toBe(2);
    expect(scenes[0].dialogues[0].speaker).toBe('Dr. Synapse');
  });

  // Test 6: Image Generation Prompts with Negative Constraints (No Text / Subtitles)
  it('Step 3: Image prompts enforce character consistency and omit text/subtitles/logos', () => {
    const scene: GeminiSceneItem = {
      id: 'sc-01',
      sceneNumber: 1,
      title: 'Alarm in Brain Central',
      durationSec: 9,
      setting: 'Neural cavern with parched crystals',
      action: 'Dr. Synapse taps holographic buttons frantically',
      cameraFraming: 'Wide Shot with dramatic volumetric lighting',
      soundCue: 'SFX: Digital alarm',
      dialogues: [],
      characterNames: ['Dr. Synapse'],
      imagePrompt: '',
      imageStatus: 'idle',
      videoPrompt: '',
      videoStatus: 'idle',
    };

    const imagePrompt = GeminiAutomationService.buildImagePrompt(scene, WATER_CRISIS_SAMPLE_PROJECT.concept);

    expect(imagePrompt).toContain('3D Expressive Pixar Style');
    expect(imagePrompt).toContain('Dr. Synapse');
    expect(imagePrompt).toContain('Luminescent pink cerebral cortex');
    // Strict negative constraint check:
    expect(imagePrompt).toContain(
      'Do NOT include any text, words, subtitles, captions, speech bubbles, logos, letters, watermarks, or user interface elements'
    );
  });

  // Test 7: Video Generation Prompts with Image-to-Video Workflow
  it('Step 4: Video prompt uses image-to-video workflow and handles dialogue preservation', () => {
    const scene = WATER_CRISIS_SAMPLE_PROJECT.scenes[0];
    const videoPrompt = GeminiAutomationService.buildVideoPrompt(scene, WATER_CRISIS_SAMPLE_PROJECT.concept);

    expect(videoPrompt).toContain('Animate this reference image using Gemini Video');
    expect(videoPrompt).toContain('ACTION & MOTION:');
    expect(videoPrompt).toContain('CAMERA MOVEMENT:');
    expect(videoPrompt).toContain('Preserve characters, colors, lighting, and composition');
    // Honest audio capability notice in prompt:
    expect(videoPrompt).toContain('If Gemini video synthesis does not generate character vocal dialogue');
  });

  // Test 8: Water Crisis Sample Content Verification
  it('Sample Content: Water Crisis story is labeled as sample and totals 36s (between 30-40s)', () => {
    const sample = WATER_CRISIS_SAMPLE_PROJECT;
    expect(sample.concept.isSampleContent).toBe(true);
    expect(sample.totalDurationSec).toBe(36);
    expect(sample.totalDurationSec).toBeGreaterThanOrEqual(30);
    expect(sample.totalDurationSec).toBeLessThanOrEqual(40);
    expect(sample.scenes.length).toBe(4);
  });

  // Test 9: Zero API Key & Session Reuse Policy
  it('Compliance: Workflow does not require API keys or external AI service endpoints', () => {
    const blank = CREATE_BLANK_GEMINI_PROJECT();
    expect(blank.id).toBeDefined();
    // Verify no apiKey property in workflow definition
    expect((blank as any).apiKey).toBeUndefined();
  });
});
