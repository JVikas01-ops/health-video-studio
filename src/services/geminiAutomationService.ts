import type {
  GeminiConcept,
  GeminiSceneItem,
  GeminiCharacterBrief,
  GeminiDialogueItem,
} from '../types/geminiAssistant';

export class GeminiAutomationService {
  private static callExtension<T>(extensionId: string, message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const runtime = (window as any).chrome?.runtime;
      if (!runtime?.sendMessage) {
        reject(new Error('Open this Studio in Google Chrome to use the Gemini companion.'));
        return;
      }
      runtime.sendMessage(extensionId, message, (response: T) => {
        const lastError = runtime.lastError;
        if (lastError) {
          reject(new Error('Could not reach the companion. Check its Extension ID and that it is enabled.'));
          return;
        }
        resolve(response);
      });
    });
  }

  public static async pingCompanion(extensionId: string) {
    if (!/^[a-p]{32}$/i.test(extensionId.trim())) {
      return { ok: false, connected: false, message: 'Enter the Extension ID from chrome://extensions.' };
    }
    try {
      const response = await this.callExtension<any>(extensionId.trim(), { type: 'PING' });
      return response || { ok: false, connected: false, message: 'The companion returned no status.' };
    } catch (error) {
      return { ok: false, connected: false, message: (error as Error).message };
    }
  }

  public static async executeInGemini(
    extensionId: string,
    prompt: string,
    mode: 'chat' | 'image' | 'video' = 'chat',
    imageUrl?: string
  ) {
    return this.callExtension<any>(extensionId.trim(), {
      type: 'EXECUTE_PROMPT',
      prompt,
      mode,
      imageUrl,
    });
  }

  public static async captureLatestResponse(extensionId: string) {
    return this.callExtension<any>(extensionId.trim(), { type: 'CAPTURE_LATEST_RESPONSE' });
  }

  public static async getMediaData(extensionId: string, url: string) {
    return this.callExtension<any>(extensionId.trim(), { type: 'GET_MEDIA_DATA', url });
  }

  // ==========================================
  // STAGE 1: STORY CONCEPT PROMPT BUILDER
  // ==========================================
  public static buildConceptPrompt(concept: Partial<GeminiConcept>): string {
    const topic = concept.topic || 'How Water & Hydration Rescues Human Organs';
    const lang = concept.language || 'English';
    const tone = concept.tone || 'Educational yet Comedic & Dramatic';
    const audience = concept.audience || 'General Public';
    const style = concept.visualStyle || '3D Expressive Pixar Style';

    return `You are a creative narrative director for cinematic 3D health and biology video stories.
Please create an original, engaging story concept based on the parameters below.

TOPIC / IDEA: "${topic}"
LANGUAGE: ${lang}${concept.includeTranslation ? ' (Include English translation if writing in another language)' : ''}
TONE: ${tone}
TARGET AUDIENCE: ${audience}
VISUAL ART STYLE: ${style}

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS (Keep the section headers intact):

### TITLE
[Enter a catchy, cinematic title for the short video]

### PREMISE
[Enter 2 to 3 sentences explaining the core situation, crisis, and resolution]

### THEME
[Enter 1 clear takeaway sentence highlighting the health / biology principle]

### CHARACTERS
- **[Character Name 1]** | Organ/Role: [e.g. Brain / Central Command] | Personality: [Traits] | Visual: [Specific animated character design details] | Voice Note: [Vocal tone & style]
- **[Character Name 2]** | Organ/Role: [e.g. Heart / Circulation] | Personality: [Traits] | Visual: [Specific animated character design details] | Voice Note: [Vocal tone & style]
- **[Character Name 3]** | Organ/Role: [e.g. Kidneys / Filtration] | Personality: [Traits] | Visual: [Specific animated character design details] | Voice Note: [Vocal tone & style]
- **[Character Name 4]** | Organ/Role: [e.g. Stomach / Digestion] | Personality: [Traits] | Visual: [Specific animated character design details] | Voice Note: [Vocal tone & style]

Ensure visual details are expressive and vivid so they can guide consistent 3D character illustrations.`;
  }

  // ==========================================
  // STAGE 1: RESPONSE PARSER
  // ==========================================
  public static parseConceptResponse(text: string): Partial<GeminiConcept> {
    const result: Partial<GeminiConcept> = {
      characters: [],
    };

    if (!text) return result;

    // Gemini may return markdown headings or plain uppercase section labels.
    const titleMatch = text.match(/^\s*(?:#{1,6}\s*)?TITLE\s*:?\s*\n+([^\n#]+)/im) ||
      text.match(/Title:\s*([^\n#]+)/i);
    if (titleMatch) {
      result.title = titleMatch[1].replace(/[*#]/g, '').trim();
    }

    // Premise
    const premiseMatch =
      text.match(/^\s*(?:#{1,6}\s*)?PREMISE\s*:?\s*\n+([\s\S]*?)(?=\n\s*(?:#{1,6}\s*)?(?:THEME|CHARACTERS)\s*:?\s*(?:\n|$)|$)/im) ||
      text.match(/Premise:\s*([^#]+?)(?=\n[A-Z]+:|$)/i);
    if (premiseMatch) {
      result.premise = premiseMatch[1].replace(/[*]/g, '').trim();
    }

    // Theme
    const themeMatch =
      text.match(/^\s*(?:#{1,6}\s*)?THEME\s*:?\s*\n+([\s\S]*?)(?=\n\s*(?:#{1,6}\s*)?CHARACTERS\s*:?\s*(?:\n|$)|$)/im) ||
      text.match(/Theme:\s*([^#]+?)(?=\n[A-Z]+:|$)/i);
    if (themeMatch) {
      result.theme = themeMatch[1].replace(/[*]/g, '').trim();
    }

    // Characters
    const charsMatch = text.match(/^\s*(?:#{1,6}\s*)?CHARACTERS\s*:?\s*\n+([\s\S]*)/im);
    const charsSection = charsMatch ? charsMatch[1] : text;

    const charLines = charsSection
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^(?:[-*•‣–—]\s+|\d+[.)]\s+)/.test(l) || /\|\s*(?:organ\/role|role):/i.test(l));

    const characters: GeminiCharacterBrief[] = [];

    charLines.forEach((line, idx) => {
      // Look for pipes or labeled segments
      const cleanLine = line.replace(/^(?:[-*•‣–—]\s+|\d+[.)]\s+)/, '').trim();
      const parts = cleanLine.split('|').map((p) => p.trim());

      let name = `Character ${idx + 1}`;
      let organRole = 'Body Organ';
      let personality = 'Expressive';
      let visualTraits = 'Pixar 3D stylized character';
      let voiceNote = 'Expressive voice';

      if (parts.length >= 2) {
        name = parts[0].replace(/[*_]/g, '').trim();
        parts.slice(1).forEach((part) => {
          const lower = part.toLowerCase();
          if (lower.startsWith('organ/role:') || lower.startsWith('role:')) {
            organRole = part.split(':')[1]?.trim() || organRole;
          } else if (lower.startsWith('personality:')) {
            personality = part.split(':')[1]?.trim() || personality;
          } else if (lower.startsWith('visual:')) {
            visualTraits = part.split(':')[1]?.trim() || visualTraits;
          } else if (lower.startsWith('voice note:') || lower.startsWith('voice:')) {
            voiceNote = part.split(':')[1]?.trim() || voiceNote;
          } else {
            // General assignment
            if (!organRole || organRole === 'Body Organ') organRole = part;
            else if (!visualTraits || visualTraits.includes('Pixar')) visualTraits = part;
          }
        });
      } else {
        const colonParts = cleanLine.split(':');
        if (colonParts.length > 1) {
          name = colonParts[0].replace(/[*_]/g, '').trim();
          visualTraits = colonParts.slice(1).join(':').replace(/[*_]/g, '').trim();
        }
      }

      characters.push({
        id: `char-${idx + 1}-${Date.now().toString(36)}`,
        name,
        organRole,
        personality,
        visualTraits,
        voiceNote,
      });
    });

    if (characters.length > 0) {
      result.characters = characters;
    }

    return result;
  }

  // ==========================================
  // STAGE 2: SCRIPT & DIALOGUE PROMPT BUILDER
  // ==========================================
  public static buildScriptPrompt(concept: Partial<GeminiConcept>, targetSeconds: number = 36): string {
    const characters = concept.characters || [];
    const charsList = characters
      .map((c) => `- ${c.name} (${c.organRole}): ${c.visualTraits}`)
      .join('\n');

    const bilingualInstruction =
      concept.language !== 'English' || concept.includeTransliteration || concept.includeTranslation
        ? `\nIMPORTANT LANGUAGE INSTRUCTIONS:
- Main Dialogue: Write dialogue in ${concept.language}.
${concept.includeTransliteration ? '- Transliteration: Provide Latin/English phonetic pronunciation for each line.' : ''}
${concept.includeTranslation ? '- Translation: Provide English translation for each line.' : ''}`
        : '';

    return `You are a cinematic screenwriter producing a tight 30–40 second animated micro-short.
Total script duration MUST be between 30 and 40 seconds. Current target duration: ${targetSeconds} seconds.

STORY TITLE: ${concept.title || 'Untitled Story'}
PREMISE: ${concept.premise || ''}
VISUAL ART STYLE: ${concept.visualStyle}
TARGET AUDIENCE: ${concept.audience}
ESTABLISHED CHARACTERS (Keep consistent):
${charsList || 'Organ characters'}
${bilingualInstruction}

Please write exactly 3 to 4 sequential numbered scenes whose individual durations sum up to ${targetSeconds} seconds (30–40 seconds total).

FORMAT YOUR SCRIPT EXACTLY LIKE THIS TEMPLATE:

---
SCENE 1: [Scene Title]
DURATION: [Duration in seconds, e.g. 9 seconds]
SETTING: [Specific environment, lighting, and mood]
ACTION: [Specific physical movement and character behavior]
CAMERA: [Framing & movement: e.g. Wide Shot (WS) with dolly push-in]
SOUND CUES: SFX: [Specific sound effects]; Music: [Musical motif or mood]
DIALOGUE:
- SPEAKER: [Character Name] | EMOTION: [Tone & delivery note]
  LINE: "[Spoken dialogue in ${concept.language}]"
${concept.includeTransliteration ? '  TRANSLITERATION: "[Phonetic Latin pronunciation]"\n' : ''}${concept.includeTranslation ? '  TRANSLATION: "[English translation]"\n' : ''}
---
SCENE 2: [Scene Title]
...
(Repeat for Scene 3 and Scene 4)

Make sure character personalities, speech patterns, and visual traits remain 100% consistent throughout.`;
  }

  // ==========================================
  // STAGE 2: SCRIPT RESPONSE PARSER
  // ==========================================
  public static parseScriptResponse(
    text: string,
    concept: GeminiConcept
  ): { scenes: GeminiSceneItem[]; totalDurationSec: number } {
    const scenes: GeminiSceneItem[] = [];
    if (!text) return { scenes: [], totalDurationSec: 0 };

    // If split by regex, clean up blocks
    const rawChunks = text.split(/(?=SCENE\s+\d+:?)/i).filter((c) => /SCENE\s+\d+/i.test(c));

    const blocksToProcess = rawChunks.length > 0 ? rawChunks : [text];

    blocksToProcess.forEach((block, idx) => {
      const sceneNumMatch = block.match(/SCENE\s+(\d+)(?::\s*([^\n]+))?/i);
      const sceneNumber = sceneNumMatch ? parseInt(sceneNumMatch[1], 10) : idx + 1;
      const title = sceneNumMatch && sceneNumMatch[2] ? sceneNumMatch[2].replace(/[*#]/g, '').trim() : `Scene ${sceneNumber}`;

      // Duration
      const durMatch = block.match(/DURATION:\s*(\d+)/i) || block.match(/(\d+)\s*(?:seconds|sec|s\b)/i);
      const durationSec = durMatch ? parseInt(durMatch[1], 10) : 9;

      // Setting
      const settingMatch = block.match(/SETTING:\s*([^\n]+(?:\n(?!(?:ACTION|CAMERA|SOUND|DIALOGUE|SCENE):)[^\n]+)*)/i);
      const setting = settingMatch ? settingMatch[1].replace(/[*_]/g, '').trim() : 'Biological chamber environment';

      // Action
      const actionMatch = block.match(/ACTION:\s*([^\n]+(?:\n(?!(?:SETTING|CAMERA|SOUND|DIALOGUE|SCENE):)[^\n]+)*)/i);
      const action = actionMatch ? actionMatch[1].replace(/[*_]/g, '').trim() : 'Characters interact dramatically';

      // Camera
      const cameraMatch = block.match(/CAMERA:\s*([^\n]+)/i);
      const cameraFraming = cameraMatch ? cameraMatch[1].replace(/[*_]/g, '').trim() : 'Wide Shot (WS) with subtle push';

      // Sound
      const soundMatch = block.match(/SOUND\s*(?:CUES)?:?\s*([^\n]+)/i);
      const soundCue = soundMatch ? soundMatch[1].replace(/[*_]/g, '').trim() : 'SFX: Ambient biological hum; Music: Dynamic orchestral cue';

      // Dialogues
      const dialogues: GeminiDialogueItem[] = [];
      const dialogueSection = block.split(/DIALOGUE:\s*/i)[1] || '';
      const speakerBlocks = dialogueSection.split(/(?=-\s*SPEAKER:?)/i).filter(Boolean);

      speakerBlocks.forEach((spkBlock, sIdx) => {
        const spkMatch = spkBlock.match(/SPEAKER:\s*([^|\n]+)(?:\|\s*EMOTION:\s*([^\n]+))?/i);
        const speaker = spkMatch ? spkMatch[1].replace(/[*_]/g, '').trim() : 'Narrator';
        const emotionalDelivery = spkMatch && spkMatch[2] ? spkMatch[2].replace(/[*_]/g, '').trim() : 'Expressive';

        const lineMatch = spkBlock.match(/LINE:\s*"([^"]+)"/i) || spkBlock.match(/LINE:\s*([^\n]+)/i);
        const dialogueText = lineMatch ? lineMatch[1].trim() : '';

        const transLitMatch = spkBlock.match(/TRANSLITERATION:\s*"([^"]+)"/i) || spkBlock.match(/TRANSLITERATION:\s*([^\n]+)/i);
        const transliteration = transLitMatch ? transLitMatch[1].trim() : undefined;

        const transMatch = spkBlock.match(/TRANSLATION:\s*"([^"]+)"/i) || spkBlock.match(/TRANSLATION:\s*([^\n]+)/i);
        const translation = transMatch ? transMatch[1].trim() : undefined;

        if (dialogueText || speaker) {
          dialogues.push({
            id: `dlg-${sceneNumber}-${sIdx + 1}-${Date.now().toString(36)}`,
            speaker,
            emotionalDelivery,
            dialogueText: dialogueText || '...',
            transliteration,
            translation,
          });
        }
      });

      // Find characters present in this scene
      const sceneText = `${setting} ${action} ${dialogues.map((d) => d.speaker).join(' ')}`;
      const characterNames = concept.characters
        .filter((c) => sceneText.toLowerCase().includes(c.name.toLowerCase()))
        .map((c) => c.name);

      // Pre-compose image prompt
      const imagePrompt = GeminiAutomationService.buildImagePrompt(
        {
          id: `sc-${sceneNumber}`,
          sceneNumber,
          title,
          durationSec,
          setting,
          action,
          cameraFraming,
          soundCue,
          dialogues,
          characterNames,
          imagePrompt: '',
          imageStatus: 'idle',
          videoPrompt: '',
          videoStatus: 'idle',
        },
        concept
      );

      // Pre-compose video prompt
      const videoPrompt = GeminiAutomationService.buildVideoPrompt(
        {
          id: `sc-${sceneNumber}`,
          sceneNumber,
          title,
          durationSec,
          setting,
          action,
          cameraFraming,
          soundCue,
          dialogues,
          characterNames,
          imagePrompt,
          imageStatus: 'idle',
          videoPrompt: '',
          videoStatus: 'idle',
        },
        concept
      );

      scenes.push({
        id: `sc-${sceneNumber}-${Date.now().toString(36)}`,
        sceneNumber,
        title,
        durationSec,
        setting,
        action,
        cameraFraming,
        soundCue,
        dialogues,
        characterNames: characterNames.length > 0 ? characterNames : concept.characters.slice(0, 2).map((c) => c.name),
        imagePrompt,
        imageStatus: 'idle',
        videoPrompt,
        videoStatus: 'idle',
      });
    });

    const totalDurationSec = scenes.reduce((sum, s) => sum + s.durationSec, 0);
    return { scenes, totalDurationSec };
  }

  // ==========================================
  // STAGE 3: IMAGE GENERATION PROMPT BUILDER
  // ==========================================
  public static buildImagePrompt(scene: GeminiSceneItem, concept: Partial<GeminiConcept>): string {
    const characters = concept.characters || [];
    const charactersInScene = characters
      .filter((c) => (scene.characterNames || []).includes(c.name) || (scene.dialogues || []).some((d) => d.speaker === c.name))
      .map((c) => `${c.name} (${c.organRole}): ${c.visualTraits}`)
      .join('; ');

    const stylePrefix = concept.visualStyle || '3D Expressive Pixar Style';

    return `Generate an image: ${stylePrefix} cinematic still.
SCENE: ${scene.setting}.
ACTION: ${scene.action}.
CHARACTERS: ${charactersInScene || 'Expressive biological organ characters'}.
CAMERA & LIGHTING: ${scene.cameraFraming}, volumetric studio lighting, rich depth of field.
CRITICAL CONSTRAINT: Do NOT include any text, words, subtitles, captions, speech bubbles, logos, letters, watermarks, or user interface elements. Clean artwork only.`;
  }

  // ==========================================
  // STAGE 4: VIDEO GENERATION PROMPT BUILDER
  // ==========================================
  public static buildVideoPrompt(scene: GeminiSceneItem, concept: GeminiConcept): string {
    const dialogueLines = scene.dialogues.map((d) => `"${d.speaker}: ${d.dialogueText}"`).join(' ');

    return `Animate this reference image using Gemini Video.
ACTION & MOTION: ${scene.action}
CAMERA MOVEMENT: ${scene.cameraFraming}
STYLE CONSISTENCY: Preserve characters, colors, lighting, and composition from the attached reference image (${concept.visualStyle}).
AUDIO / AMBIENCE: ${scene.soundCue}
DIALOGUE NOTE: Scene dialogue is: ${dialogueLines || 'Ambient physical reaction'}. (Note: If Gemini video synthesis does not generate character vocal dialogue, animate facial expressions, mouth gestures, and body language to match).`;
  }

}
