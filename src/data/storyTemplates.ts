import type { Scene, Shot, ShotDialogue, ShotSoundEffect, Character, TargetAudience, VisualStyle } from '../types';

export interface StoryTemplate {
  id: string;
  topic: string;
  title: string;
  summary: string;
  category: 'Metabolism' | 'Cardio' | 'Immunity' | 'Daily Habits' | 'Digestive';
  targetAudience: 'Kids & Family' | 'Teens & Students' | 'General Public' | 'Medical & Biology Enthusiasts';
  visualStyle: '3D Expressive Pixar Style' | '2D Vibrant Comic Animation' | 'Cyberpunk Sci-Fi Cellular' | 'Stylized Claymation Organics';
  scenes: {
    sceneNumber: number;
    title: string;
    environment: string;
    description: string;
    shots: {
      shotCode: string;
      shotType: any;
      cameraInstruction: string;
      description: string;
      characterKeys: ('brain' | 'heart' | 'lungs' | 'stomach' | 'liver' | 'kidneys')[];
      dialogues: {
        characterKey: 'brain' | 'heart' | 'lungs' | 'stomach' | 'liver' | 'kidneys';
        line: string;
        audioPrompt?: string;
      }[];
      imagePrompt: string;
      videoPrompt: string;
      backgroundMusicTrack?: string;
      soundEffects: { name: string; prompt: string }[];
      durationSec: number;
      notes?: string;
    }[];
  }[];
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'caffeine-rush',
    topic: 'How Coffee & Caffeine Affect the Human Body',
    title: 'Code Red Caffeine: The Morning Alarm in Body Central',
    summary: 'A 200mg shot of caffeine arrives in the stomach and shoots through the bloodstream. Dr. Synapse mistakes caffeine for adenosine, while Captain Pulse hits turbo mode.',
    category: 'Daily Habits',
    targetAudience: 'General Public',
    visualStyle: '3D Expressive Pixar Style',
    scenes: [
      {
        sceneNumber: 1,
        title: 'The Morning Splashdown',
        environment: 'Upper Gastric Chamber with glowing mucosal cavern walls',
        description: 'Chef Acidus is peacefully sleeping when an avalanche of hot dark roast espresso floods the gastric lining.',
        shots: [
          {
            shotCode: 'SC01-SH01',
            shotType: 'Wide Shot (WS)',
            cameraInstruction: 'Slow crane down through the esophagus opening into the churning gastric chamber',
            description: 'A glossy dark cascade of warm coffee splashes into the bubbling gastric pool, sending shimmering ripples everywhere.',
            characterKeys: ['stomach'],
            dialogues: [
              {
                characterKey: 'stomach',
                line: 'Mama mia! What is this acidic tidal wave at 7:00 AM? No toast? Just pure Colombian roast?!',
                audioPrompt: 'Theatrical grumpy French-Italian chef voice, alarmed and expressive',
              },
            ],
            imagePrompt: '3D animated scene inside gastric chamber, Chef Acidus holding a golden ladle, dark coffee whirlpool splashing with foam bubbles, Pixar rendering, warm amber lighting',
            videoPrompt: 'Cinematic slow motion fluid simulation of coffee crashing into stomach juices, Chef Acidus reacting comically, high quality 3D animation',
            backgroundMusicTrack: 'Playful upbeat jazzy bassline with accordion accents',
            soundEffects: [
              { name: 'Liquid Splash', prompt: 'Submerged deep liquid splash with bubbly fizz' },
              { name: 'Alarm Bell', prompt: 'Comic mechanical ding bell ringing' },
            ],
            durationSec: 5,
            notes: 'Establish comedic contrast between lazy morning and sudden liquid caffeine influx.',
          },
          {
            shotCode: 'SC01-SH02',
            shotType: 'Close-up (CU)',
            cameraInstruction: 'Low angle push-in onto Chef Acidus inspecting the tiny glittering caffeine crystals',
            description: 'Chef Acidus touches a glowing caffeine molecule with his ladle as it permeates through the stomach wall capillaries.',
            characterKeys: ['stomach'],
            dialogues: [
              {
                characterKey: 'stomach',
                line: 'Wait... these tiny spiked crystals! They bypass digestion completely! Bloodstream express, prepare for boarding!',
                audioPrompt: 'Fast-paced realization, rising comedic crescendo',
              },
            ],
            imagePrompt: 'Macro extreme close-up of translucent golden caffeine molecules penetrating capillaries, Chef Acidus observing through magnifying glass, Pixar style glowing particle sparks',
            videoPrompt: 'Camera pulls in fast as glowing caffeine particles zip across the screen like micro rockets through biological membrane',
            backgroundMusicTrack: 'Playful jazzy bass building with pizzicato strings',
            soundEffects: [
              { name: 'Synaptic Sparkle', prompt: 'Whimsical high-frequency tingling chime' },
            ],
            durationSec: 4,
          },
        ],
      },
      {
        sceneNumber: 2,
        title: 'Synaptic Confusion at Brain Central',
        environment: 'Neural Bridge with bioluminescent violet synapses and floating neurotransmitter receptors',
        description: 'Dr. Synapse is about to activate the sleepiness receptors when caffeine molecules slip in and lock the brakes.',
        shots: [
          {
            shotCode: 'SC02-SH01',
            shotType: 'Medium Shot (MS)',
            cameraInstruction: 'Tracking camera moving alongside Dr. Synapse walking past adenosine receptor docks',
            description: 'Dr. Synapse yawned, holding a rubber stamp marked "FATIGUE". Suddenly, jagged caffeine shapes slot into the receptors.',
            characterKeys: ['brain'],
            dialogues: [
              {
                characterKey: 'brain',
                line: 'Ah, time to park adenosine and trigger the afternoon snooze... Wait! Who parked these imposter keys in my sleep locks?!',
                audioPrompt: 'Fast intellectual professor voice, sudden realization and confusion',
              },
            ],
            imagePrompt: 'Dr. Synapse with golden spectacles inspecting a docking receptor where a caffeine molecule sits, neon pink brain backdrop with electric lightning, 3D character animation',
            videoPrompt: 'Synapses crackle with bright azure arcs as Dr. Synapse pushes his glasses up in sheer scientific bewilderment',
            backgroundMusicTrack: 'Electronic synth arpeggio accelerating',
            soundEffects: [
              { name: 'Laser Docking Click', prompt: 'High tech sci-fi magnetic clamp locking shut' },
            ],
            durationSec: 6,
          },
          {
            shotCode: 'SC02-SH02',
            shotType: 'Macro Extreme Close-up (ECU)',
            cameraInstruction: 'Dutch tilt snap zoom into Dr. Synapse’s flashing electric eyes',
            description: 'With adenosine blocked, dopamine and adrenaline triggers burst open in vivid gold fireworks.',
            characterKeys: ['brain'],
            dialogues: [
              {
                characterKey: 'brain',
                line: 'Adenosine blocked! Dopamine levels surging! Captain Pulse, take the throttle! WE ARE CODING AT 300 WPM!',
                audioPrompt: 'Energetic triumphant shouting with comedic intensity',
              },
            ],
            imagePrompt: 'Macro shot of brain synapses overflowing with golden stardust particles, Dr. Synapse with wide ecstatic eyes, Pixar cinematic lighting',
            videoPrompt: 'Zoom through the iris of Dr. Synapse into an explosion of bio-electrical neural fireworks, 4K smooth motion',
            backgroundMusicTrack: 'High octane electro-orchestral drum groove kicks in',
            soundEffects: [
              { name: 'Power Surge Whoosh', prompt: 'Deep sub-bass swell into high voltage electric discharge' },
            ],
            durationSec: 5,
          },
        ],
      },
      {
        sceneNumber: 3,
        title: 'Full Throttle in the Chest Cavity',
        environment: 'Aortic Grand Archway surrounded by rhythmic muscular red columns',
        description: 'Captain Pulse receives the adrenaline alert and revs up the ventricular pumps from 70 to 115 BPM.',
        shots: [
          {
            shotCode: 'SC03-SH01',
            shotType: 'Close-up (CU)',
            cameraInstruction: 'Dynamic rhythmic camera shake synchronized with heavy bass drum beats',
            description: 'Captain Pulse tightens his sweatband, muscular ventricles pumping in high-speed heroic rhythm.',
            characterKeys: ['heart'],
            dialogues: [
              {
                characterKey: 'heart',
                line: 'BOOM-CHUCK! BOOM-CHUCK! Message received from HQ! Increasing systolic pressure by 15%! Lungs, give me air!',
                audioPrompt: 'Booming motivational coach voice, breathless excitement',
              },
            ],
            imagePrompt: 'Captain Pulse the muscular 3D Pixar heart flexing with veins of glowing oxygenated blood, heroic low angle, stadium lighting',
            videoPrompt: 'Captain Pulse pumps vigorously in sync with pounding bass, steam venting comically from aorta pipe, smooth 3D motion',
            backgroundMusicTrack: 'Driving 120 BPM drum and bass heart thumper',
            soundEffects: [
              { name: 'Heavy Heartbeat', prompt: 'Resonant acoustic double thumping heartbeat lub-dub lub-dub' },
            ],
            durationSec: 5,
          },
          {
            shotCode: 'SC03-SH02',
            shotType: 'Medium Shot (MS)',
            cameraInstruction: 'Whip pan to The Respiro Twins breathing in swift unison',
            description: 'The Respiro Twins flap their cyan lung lobes like bellows, pumping crisp oxygen directly into Captain Pulse’s intake valves.',
            characterKeys: ['lungs', 'heart'],
            dialogues: [
              {
                characterKey: 'lungs',
                line: 'Deep breath in... and blow! Who invited this double espresso to our peaceful morning meditation?!',
                audioPrompt: 'Airy breezy twin voices talking simultaneously in harmonious breathy cadence',
              },
            ],
            imagePrompt: 'The Respiro Twins the cyan lung characters inhaling a stream of sparkling blue oxygen vortex, dynamic lighting, Pixar studio look',
            videoPrompt: 'Lungs expand gracefully then contract, blowing shimmering blue wind onto the screen, 3D animated character render',
            backgroundMusicTrack: 'Fast tempo orchestral groove continues',
            soundEffects: [
              { name: 'Whooshing Wind', prompt: 'Clean deep respiratory wind whoosh' },
            ],
            durationSec: 5,
          },
        ],
      },
      {
        sceneNumber: 4,
        title: 'The Clean Up Crew Steps In',
        environment: 'Renal Glomerulus Filtration Chamber with crystalline fluid streams and Commander Detox’s refinery',
        description: 'Commander Detox and the Nephron Duo prepare to metabolize the caffeine and regulate electrolyte hydration.',
        shots: [
          {
            shotCode: 'SC04-SH01',
            shotType: 'Wide Shot (WS)',
            cameraInstruction: 'Dolly forward across sparkling filtration tubes into Commander Detox’s laboratory desk',
            description: 'Commander Detox rolls up his sleeves while the Nephron Duo frantically calculate water levels on a holographic clipboard.',
            characterKeys: ['liver', 'kidneys'],
            dialogues: [
              {
                characterKey: 'liver',
                line: 'Calm down, team. Cytochrome P450 enzymes are deploying. Half-life is 5 hours. We have this under control.',
                audioPrompt: 'Deep steady baritone commander voice, reassuring and stoic',
              },
              {
                characterKey: 'kidneys',
                line: 'Under control?! Caffeine is a mild diuretic! Tell the human to DRINK A GLASS OF WATER IMMEDIATELY!',
                audioPrompt: 'Chirpy neurotic twin bean inspectors shouting in comical high pitch',
              },
            ],
            imagePrompt: 'Commander Detox the bronze liver character adjusting chemical levers next to the Nephron Duo holding a giant water drop banner, Pixar animation style',
            videoPrompt: 'Commander Detox flips glowing chemical switches as the Nephron Duo bounce around frantically pointing at water gauges',
            backgroundMusicTrack: 'Triumphant playful resolution fanfare',
            soundEffects: [
              { name: 'Water Drop Gurgle', prompt: 'Echoing clean water droplet splash and digital beep' },
            ],
            durationSec: 6,
            notes: 'Closing educational takeaway: caffeine boosts focus, but balance with water.',
          },
        ],
      },
    ],
  },
  {
    id: 'pizza-journey',
    topic: 'How the Digestive System Breaks Down a Slice of Pizza',
    title: 'The Great Pizza Odyssey: From Crust to Cellular Fuel',
    summary: 'A greasy slice of pepperoni pizza enters the gastrointestinal labyrinth. Chef Acidus attacks proteins, Commander Detox emulsifies fats with bile, and the bloodstream collects glucose.',
    category: 'Digestive',
    targetAudience: 'Kids & Family',
    visualStyle: '3D Expressive Pixar Style',
    scenes: [
      {
        sceneNumber: 1,
        title: 'Welcome to the Churning Cauldron',
        environment: 'Gastric Acid Lagoon with glowing yellow-green enzyme waterfalls',
        description: 'Chef Acidus inspects chunks of melted cheese and crunchy crust arriving through the cardiac sphincter.',
        shots: [
          {
            shotCode: 'SC01-SH01',
            shotType: 'Wide Shot (WS)',
            cameraInstruction: 'Boom down as gooey mozzarella strings drop into the stomach pool',
            description: 'A massive chunk of delicious pizza lands in the gastric pool with a triumphant gooey bounce.',
            characterKeys: ['stomach'],
            dialogues: [
              {
                characterKey: 'stomach',
                line: 'Behold! A magnificent mountain of complex carbohydrates, dairy fats, and savory peptides! Pepsin, start your engines!',
                audioPrompt: 'Theatrical gourmet chef voice, passionate and dramatic',
              },
            ],
            imagePrompt: 'Chef Acidus standing on a ledge in front of a bubbling green-gold gastric lake with cartoon mozzarella cheese strings, Pixar 3D style',
            videoPrompt: 'Slow motion shot of cheese landing in bubbling liquid with bubbly ripples, Chef Acidus cheering with a wooden spoon',
            backgroundMusicTrack: 'Festive Italian tarantella with whimsical accordion and flute',
            soundEffects: [{ name: 'Gooey Splat', prompt: 'Wet stretchy cheese splat with warm bubbling' }],
            durationSec: 5,
          },
        ],
      },
      {
        sceneNumber: 2,
        title: 'Bile Cannon Deployment at Liver HQ',
        environment: 'Hepatic Refinery with golden ducts and emerald gallbladder reservoir',
        description: 'Commander Detox discovers the heavy lipid payload and fires the bile emulsifiers into the duodenum.',
        shots: [
          {
            shotCode: 'SC02-SH01',
            shotType: 'Close-up (CU)',
            cameraInstruction: 'Low angle rotating tracking shot around Commander Detox',
            description: 'Commander Detox locks onto cheese grease globules and presses the green bile valve button.',
            characterKeys: ['liver'],
            dialogues: [
              {
                characterKey: 'liver',
                line: 'Heavy lipid invasion detected! Deploy the green bile torpedoes! Break those stubborn fats into microscopic micelles!',
                audioPrompt: 'Gravelly military general barking orders with stern precision',
              },
            ],
            imagePrompt: 'Commander Detox firing a glowing emerald beam of bile salts at lipid droplets, Pixar character design, dramatic lighting',
            videoPrompt: 'Bile beam hits fat droplets, causing them to burst into millions of harmless sparkling micro-bubbles, fluid dynamics',
            backgroundMusicTrack: 'Heroic cinematic military brass motif',
            soundEffects: [{ name: 'Laser Squirt', prompt: 'High tech chemical pressurization hiss and pop' }],
            durationSec: 5,
          },
        ],
      },
    ],
  },
  {
    id: 'flu-invasion',
    topic: 'How the Immune System and Organs Defeat the Flu Virus',
    title: 'Cellular Fortress: The 48-Hour Viral Siege',
    summary: 'Influenza virions land in the respiratory tract. The Lungs trigger the cough reflex, Dr. Synapse turns up the body thermostat, and Commander Detox cleans up the battlefield debris.',
    category: 'Immunity',
    targetAudience: 'Teens & Students',
    visualStyle: 'Cyberpunk Sci-Fi Cellular',
    scenes: [
      {
        sceneNumber: 1,
        title: 'Breach at the Bronchial Gates',
        environment: 'Ciliated respiratory highway with waving golden micro-hair filaments',
        description: 'Spiky magenta flu virions attempt to latch onto epithelial cells while The Respiro Twins unleash the mucus elevator.',
        shots: [
          {
            shotCode: 'SC01-SH01',
            shotType: 'Tracking Camera',
            cameraInstruction: 'Fast swooping fly-through between vibrating cilia filaments',
            description: 'The Respiro Twins spot viral spikes adhering to respiratory walls and pull the emergency cough lever.',
            characterKeys: ['lungs'],
            dialogues: [
              {
                characterKey: 'lungs',
                line: 'Intruders with Hemagglutinin spikes spotted! Cilia, wave maximum frequency! COUGH CANNON FIRING IN THREE, TWO, ONE!',
                audioPrompt: 'Urgent breathy announcement transitioning into heroic gust sound',
              },
            ],
            imagePrompt: 'Stylized cyberpunk respiratory highway with glowing cyan cilia hairs, purple spiky cartoon virus particles flying backwards, 3D render',
            videoPrompt: 'Vortex of air rushes through the chamber blasting glowing purple viruses backward into the distance, cinematic lighting',
            backgroundMusicTrack: 'Pulsing sci-fi electronic synthwave with tense percussion',
            soundEffects: [{ name: 'Sonic Blast', prompt: 'Heavy air compression whoosh blast wave' }],
            durationSec: 6,
          },
        ],
      },
      {
        sceneNumber: 2,
        title: 'Hypothalamus Thermostat Override',
        environment: 'Neural Command Central with giant glowing red thermometer levers',
        description: 'Dr. Synapse calculates that viral replication stops above 101 degrees Fahrenheit and cranks up the core fever.',
        shots: [
          {
            shotCode: 'SC02-SH01',
            shotType: 'Close-up (CU)',
            cameraInstruction: 'Dramatic push into Dr. Synapse’s hand pulling down a heavy scarlet thermal switch',
            description: 'Dr. Synapse activates pyrogens, raising the bodily temperature to roast the invaders.',
            characterKeys: ['brain'],
            dialogues: [
              {
                characterKey: 'brain',
                line: 'These viruses hate heat! Raising the hypothalamus thermostat to 101°F! Captain Pulse, increase circulation for white blood cells!',
                audioPrompt: 'Intense tactical professor voice, heroic and commanding',
              },
            ],
            imagePrompt: 'Dr. Synapse pulling a glowing crimson lever on a sci-fi brain pedestal, amber heat waves radiating, Pixar cyberpunk lighting',
            videoPrompt: 'Heat distortion waves ripple through the chamber as the thermometer mercury rises in bright scarlet neon, 60fps',
            backgroundMusicTrack: 'Driving energetic action score with brass horns',
            soundEffects: [{ name: 'Heavy Switch Clunk', prompt: 'Mechanical high voltage switch slam with hum' }],
            durationSec: 5,
          },
        ],
      },
    ],
  },
  {
    id: 'hydration-rescue',
    topic: 'Severe Dehydration vs Cold Crisp Water',
    title: 'Desert in the Veins: The Renal Water Emergency',
    summary: 'A hot afternoon without water sends the blood pressure plunging and electrolyte salinity through the roof until a cold bottle of water saves the day.',
    category: 'Daily Habits',
    targetAudience: 'Kids & Family',
    visualStyle: '3D Expressive Pixar Style',
    scenes: [
      {
        sceneNumber: 1,
        title: 'The Great Salinity Spike',
        environment: 'Arterial Riverbed with slow-moving sludge-like red blood cells',
        description: 'Captain Pulse is struggling to pump thick concentrated blood, while the Nephron Duo desperately conserve every micro-drop.',
        shots: [
          {
            shotCode: 'SC01-SH01',
            shotType: 'Medium Shot (MS)',
            cameraInstruction: 'Slow tracking shot showing sluggish red blood cell bumper-to-bumper traffic',
            description: 'The Nephron Duo are running around with tiny sponges, recycling every drop of plasma filtrate.',
            characterKeys: ['kidneys', 'heart'],
            dialogues: [
              {
                characterKey: 'kidneys',
                line: 'Emergency antidiuretic hormone active! We cannot let one single drop of water escape! Human, please drink something!',
                audioPrompt: 'Frantic high-speed squeaky bean voices, panicky comic timing',
              },
              {
                characterKey: 'heart',
                line: 'My ventricles are pumping thick syrup here! Help me out!',
                audioPrompt: 'Strained tired athlete voice, panting between words',
              },
            ],
            imagePrompt: 'The Nephron Duo characters hugging a glowing blue water drop desperately while Captain Pulse wipes sweat from his brow, Pixar 3D style',
            videoPrompt: 'Camera zooms across the parched arterial corridor as tiny alarm sirens flash yellow warning lights, smooth 3D motion',
            backgroundMusicTrack: 'Comedic tension ticking clock with pizzicato strings',
            soundEffects: [{ name: 'Alarm Chirp', prompt: 'Gentle comic digital warning beep sequence' }],
            durationSec: 6,
          },
        ],
      },
    ],
  },
];

export const buildProjectFromTemplate = (templateId: string, projectId: string, characters: Character[]): {
  topic: string;
  title: string;
  summary: string;
  targetAudience: any;
  visualStyle: any;
  scenes: Scene[];
} => {
  const template = STORY_TEMPLATES.find((t) => t.id === templateId) || STORY_TEMPLATES[0];

  const charMap: Record<string, Character> = {};
  characters.forEach((c) => {
    charMap[c.organType] = c;
  });

  const scenes: Scene[] = template.scenes.map((s, sIdx) => {
    const sceneId = `scene-${projectId}-${s.sceneNumber}`;
    const shots: Shot[] = s.shots.map((sh, shIdx) => {
      const shotId = `shot-${sceneId}-${shIdx + 1}`;
      
      const charIds = sh.characterKeys
        .map((k) => charMap[k]?.id)
        .filter(Boolean) as string[];

      const dialogues: ShotDialogue[] = sh.dialogues.map((d, dIdx) => {
        const char = charMap[d.characterKey];
        return {
          id: `dlg-${shotId}-${dIdx + 1}`,
          characterId: char ? char.id : '',
          characterName: char ? char.name : d.characterKey.toUpperCase(),
          line: d.line,
          audioPrompt: d.audioPrompt,
          durationSec: Math.max(3, Math.ceil(d.line.split(' ').length / 2.5)),
        };
      });

      const soundEffects: ShotSoundEffect[] = sh.soundEffects.map((sfx, sfxIdx) => ({
        id: `sfx-${shotId}-${sfxIdx + 1}`,
        name: sfx.name,
        prompt: sfx.prompt,
        approvalStatus: 'draft',
        approvalHistory: [],
      }));

      return {
        id: shotId,
        sceneId,
        order: shIdx + 1,
        shotCode: sh.shotCode,
        shotType: sh.shotType,
        cameraInstruction: sh.cameraInstruction,
        description: sh.description,
        characterIds: charIds,
        dialogues,
        imagePrompt: sh.imagePrompt,
        videoPrompt: sh.videoPrompt,
        approvalStatus: 'draft',
        approvalHistory: [],
        imageGenerationMode: 'single',
        imageCandidates: [],
        videoCandidates: [],
        status: 'planned',
        backgroundMusicTrack: sh.backgroundMusicTrack,
        soundEffects,
        durationSec: sh.durationSec,
        notes: sh.notes,
      };
    });

    return {
      id: sceneId,
      projectId,
      order: sIdx + 1,
      sceneNumber: s.sceneNumber,
      title: s.title,
      environment: s.environment,
      description: s.description,
      approval: {
        status: 'draft',
        history: [],
      },
      shots,
    };
  });

  return {
    topic: template.topic,
    title: template.title,
    summary: template.summary,
    targetAudience: template.targetAudience,
    visualStyle: template.visualStyle,
    scenes,
  };
};

export const generateCustomStory = (
  topic: string,
  projectId: string,
  characters: Character[],
  targetAudience: TargetAudience = 'General Public',
  visualStyle: VisualStyle = '3D Expressive Pixar Style'
): {
  title: string;
  summary: string;
  scenes: Scene[];
} => {
  // Dynamic scientific generator based on topic keywords
  const title = `The Inner Workings: How ${topic} Affects Your Vital Organs`;
  const summary = `An educational and hilarious journey tailored for ${targetAudience} in ${visualStyle}, showing how Dr. Synapse, Captain Pulse, Chef Acidus, and Commander Detox respond to ${topic}.`;

  const charMap: Record<string, Character> = {};
  characters.forEach((c) => {
    charMap[c.organType] = c;
  });

  const scene1Id = `scene-${projectId}-1`;
  const scene2Id = `scene-${projectId}-2`;
  const scene3Id = `scene-${projectId}-3`;

  const scenes: Scene[] = [
    {
      id: scene1Id,
      projectId,
      order: 1,
      sceneNumber: 1,
      title: `Arrival of ${topic}`,
      environment: 'Upper Digestive & Circulatory Portway',
      description: `The body encounters ${topic}. Chef Acidus and the sensory receptors assess the immediate physiological impact.`,
      approval: { status: 'draft', history: [] },
      shots: [
        {
          id: `shot-${scene1Id}-1`,
          sceneId: scene1Id,
          order: 1,
          shotCode: 'SC01-SH01',
          shotType: 'Wide Shot (WS)',
          cameraInstruction: 'Dynamic dolly crane move revealing the biological chamber reaction',
          description: `Signals related to ${topic} echo through the biological cellular conduits.`,
          characterIds: [charMap['stomach']?.id || '', charMap['brain']?.id || ''].filter(Boolean),
          dialogues: [
            {
              id: `dlg-${scene1Id}-1`,
              characterId: charMap['stomach']?.id || '',
              characterName: charMap['stomach']?.name || 'Chef Acidus',
              line: `Attention all organs! A new input just arrived: ${topic}! Enzymes, analyze the molecular composition immediately!`,
              audioPrompt: 'Theatrical chef voice, excited and authoritative',
              durationSec: 5,
            },
            {
              id: `dlg-${scene1Id}-2`,
              characterId: charMap['brain']?.id || '',
              characterName: charMap['brain']?.name || 'Dr. Synapse',
              line: `Telemetry confirmed! Synapses are calibrating. This is going to trigger an intriguing biological chain reaction.`,
              audioPrompt: 'Intellectual professor voice with witty scientific curiosity',
              durationSec: 4,
            },
          ],
          imagePrompt: `Cinematic 3D animation, inside the human body reacting to ${topic}, expressive organ characters observing glowing cellular particle streams, Pixar studio lighting, 8k render`,
          videoPrompt: `Camera sweeps gracefully through bioluminescent cellular corridors as cartoon organs examine shimmering data displays about ${topic}`,
          approvalStatus: 'draft',
          approvalHistory: [],
          imageGenerationMode: 'single',
          imageCandidates: [],
          videoCandidates: [],
          status: 'planned',
          backgroundMusicTrack: 'Intriguing scientific orchestral strings with playful mallet percussion',
          soundEffects: [{ id: 'sfx-1', name: 'Cellular Ripple', prompt: 'Warm organic chime with subtle bubbling resonance' }],
          durationSec: 6,
        },
      ],
    },
    {
      id: scene2Id,
      projectId,
      order: 2,
      sceneNumber: 2,
      title: 'The Physiological Response',
      environment: 'Central Cardiovascular Highway & Lungs',
      description: `Captain Pulse and The Respiro Twins coordinate blood flow and respiration to distribute nutrients and maintain homeostasis during ${topic}.`,
      approval: { status: 'draft', history: [] },
      shots: [
        {
          id: `shot-${scene2Id}-1`,
          sceneId: scene2Id,
          order: 1,
          shotCode: 'SC02-SH01',
          shotType: 'Medium Shot (MS)',
          cameraInstruction: 'Rhythmic push in on Captain Pulse matching the heartbeat tempo',
          description: `Captain Pulse pumps oxygen-rich blood through gleaming arterial arches.`,
          characterIds: [charMap['heart']?.id || '', charMap['lungs']?.id || ''].filter(Boolean),
          dialogues: [
            {
              id: `dlg-${scene2Id}-1`,
              characterId: charMap['heart']?.id || '',
              characterName: charMap['heart']?.name || 'Captain Pulse',
              line: `Cardiac output adjusting! Whatever ${topic} brings, our 60,000 miles of blood vessels are ready for the marathon!`,
              audioPrompt: 'Booming motivational coach, resonant and cheerful',
              durationSec: 5,
            },
            {
              id: `dlg-${scene2Id}-2`,
              characterId: charMap['lungs']?.id || '',
              characterName: charMap['lungs']?.name || 'The Respiro Twins',
              line: `Oxygen delivery optimized! Keep breathing smoothly, team homeostasis is holding strong!`,
              audioPrompt: 'Calm breezy harmonious twins',
              durationSec: 4,
            },
          ],
          imagePrompt: `Captain Pulse pumping vigorously in glowing red heart chamber, The Respiro Twins floating peacefully above with cyan airflow ribbons, Pixar character design`,
          videoPrompt: 'Heroic 3D camera pan around Captain Pulse flexing as rhythmic pulses of blue and red light radiate through translucent vessel arches',
          approvalStatus: 'draft',
          approvalHistory: [],
          imageGenerationMode: 'single',
          imageCandidates: [],
          videoCandidates: [],
          status: 'planned',
          backgroundMusicTrack: 'Uplifting rhythmic cinematic pulse with brass harmonies',
          soundEffects: [{ id: 'sfx-2', name: 'Rhythmic Heartbeat', prompt: 'Warm acoustic double heartbeat thump' }],
          durationSec: 6,
        },
      ],
    },
    {
      id: scene3Id,
      projectId,
      order: 3,
      sceneNumber: 3,
      title: 'Filtration, Balance & Takeaways',
      environment: 'Metabolic & Renal Purification Station',
      description: `Commander Detox and the Nephron Duo wrap up the cycle, teaching viewers the golden health habit regarding ${topic}.`,
      approval: { status: 'draft', history: [] },
      shots: [
        {
          id: `shot-${scene3Id}-1`,
          sceneId: scene3Id,
          order: 1,
          shotCode: 'SC03-SH01',
          shotType: 'Close-up (CU)',
          cameraInstruction: 'Gentle circular arc around Commander Detox and the Nephron Duo',
          description: `Commander Detox stamps the process approved while the Nephron Duo give two thumbs up.`,
          characterIds: [charMap['liver']?.id || '', charMap['kidneys']?.id || ''].filter(Boolean),
          dialogues: [
            {
              id: `dlg-${scene3Id}-1`,
              characterId: charMap['liver']?.id || '',
              characterName: charMap['liver']?.name || 'Commander Detox',
              line: `Metabolism complete. When it comes to ${topic}, moderation, balanced nutrients, and consistent sleep give us organs the ultimate edge!`,
              audioPrompt: 'Dependable baritone general voice, authoritative yet warm',
              durationSec: 6,
            },
            {
              id: `dlg-${scene3Id}-2`,
              characterId: charMap['kidneys']?.id || '',
              characterName: charMap['kidneys']?.name || 'The Nephron Duo',
              line: `And don't forget the golden rule: drink fresh water and stay hydrated!`,
              audioPrompt: 'Snappy cheerful high-pitched twin inspectors',
              durationSec: 4,
            },
          ],
          imagePrompt: `Commander Detox and The Nephron Duo characters presenting a glowing golden seal of health approval, crystalline water drops falling gently, 3D Pixar render`,
          videoPrompt: 'Sparkling biological sparkles drift as characters celebrate successful bodily harmony, warm studio lighting',
          approvalStatus: 'draft',
          approvalHistory: [],
          imageGenerationMode: 'single',
          imageCandidates: [],
          videoCandidates: [],
          status: 'planned',
          backgroundMusicTrack: 'Inspiring cheerful conclusion theme with bells and strings',
          soundEffects: [{ id: 'sfx-3', name: 'Chime of Success', prompt: 'Magical triumphant orchestra bell sparkle' }],
          durationSec: 6,
        },
      ],
    },
  ];

  return { title, summary, scenes };
};
