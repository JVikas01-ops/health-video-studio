import type { Character, OrganType } from '../types';

// Helper to create transparent expressive SVG avatars
const createOrganSvg = (type: OrganType, expression: string, color: string, secondaryColor: string): string => {
  const eyes = expression === 'panicked'
    ? `<circle cx="36" cy="45" r="7" fill="#ffffff"/><circle cx="36" cy="45" r="3" fill="#000000"/><circle cx="64" cy="45" r="7" fill="#ffffff"/><circle cx="64" cy="45" r="3" fill="#000000"/><ellipse cx="50" cy="68" rx="8" ry="12" fill="#2b0000" stroke="#fff" stroke-width="1.5"/>`
    : expression === 'excited'
    ? `<circle cx="36" cy="45" r="6" fill="#ffffff"/><circle cx="38" cy="44" r="3" fill="#1e293b"/><circle cx="64" cy="45" r="6" fill="#ffffff"/><circle cx="66" cy="44" r="3" fill="#1e293b"/><path d="M 36 62 Q 50 78 64 62 Z" fill="#ffffff" stroke="#e11d48" stroke-width="2"/>`
    : expression === 'thinking'
    ? `<ellipse cx="36" cy="42" r="5" fill="#ffffff"/><circle cx="38" cy="40" r="2.5" fill="#1e293b"/><ellipse cx="64" cy="42" r="5" fill="#ffffff"/><circle cx="66" cy="40" r="2.5" fill="#1e293b"/><path d="M 42 66 Q 50 62 58 66" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="75" cy="25" r="4" fill="#facc15" opacity="0.8"/>`
    : `<circle cx="36" cy="46" r="5" fill="#ffffff"/><circle cx="37" cy="46" r="2.5" fill="#0f172a"/><circle cx="64" cy="46" r="5" fill="#ffffff"/><circle cx="65" cy="46" r="2.5" fill="#0f172a"/><path d="M 40 64 Q 50 72 60 64" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none"/>`;

  let organBody = '';
  switch (type) {
    case 'brain':
      organBody = `
        <defs>
          <linearGradient id="brainGrad_${expression}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <!-- Brain Lobes -->
        <path d="M 25 50 C 15 35 30 18 45 22 C 50 14 65 14 70 24 C 85 20 95 35 85 55 C 92 70 80 85 65 82 C 55 88 45 88 38 82 C 20 84 15 65 25 50 Z" fill="url(#brainGrad_${expression})" stroke="#ffffff" stroke-width="2.5"/>
        <path d="M 35 32 Q 45 40 38 52" stroke="#fda4af" stroke-width="2" fill="none" opacity="0.6"/>
        <path d="M 65 32 Q 55 40 62 52" stroke="#fda4af" stroke-width="2" fill="none" opacity="0.6"/>
        <path d="M 45 22 Q 50 55 48 80" stroke="#fda4af" stroke-width="2.5" fill="none" opacity="0.7"/>
      `;
      break;
    case 'heart':
      organBody = `
        <defs>
          <linearGradient id="heartGrad_${expression}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <!-- Aorta and arteries -->
        <path d="M 42 22 L 42 12 Q 50 8 58 12 L 58 22" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M 48 10 L 48 5 M 54 10 L 54 5" stroke="#ef4444" stroke-width="3"/>
        <!-- Heart Muscle -->
        <path d="M 50 88 C 20 65 15 38 32 25 C 44 15 50 30 50 30 C 50 30 56 15 68 25 C 85 38 80 65 50 88 Z" fill="url(#heartGrad_${expression})" stroke="#ffffff" stroke-width="2.5"/>
      `;
      break;
    case 'lungs':
      organBody = `
        <defs>
          <linearGradient id="lungsGrad_${expression}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <!-- Trachea -->
        <path d="M 50 14 L 50 35 M 46 20 L 54 20 M 46 26 L 54 26" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
        <path d="M 50 35 L 38 45 M 50 35 L 62 45" stroke="#94a3b8" stroke-width="2.5"/>
        <!-- Left & Right Lung -->
        <path d="M 45 42 C 35 35 20 40 20 58 C 20 78 35 84 44 80 C 46 65 47 50 45 42 Z" fill="url(#lungsGrad_${expression})" stroke="#ffffff" stroke-width="2"/>
        <path d="M 55 42 C 65 35 80 40 80 58 C 80 78 65 84 56 80 C 54 65 53 50 55 42 Z" fill="url(#lungsGrad_${expression})" stroke="#ffffff" stroke-width="2"/>
      `;
      break;
    case 'stomach':
      organBody = `
        <defs>
          <linearGradient id="stomachGrad_${expression}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <!-- Esophagus and Duodenum -->
        <path d="M 38 12 Q 38 24 45 28" stroke="#f43f5e" stroke-width="4" fill="none"/>
        <!-- Stomach J-shape -->
        <path d="M 44 28 C 30 26 18 42 22 62 C 26 80 50 88 68 84 C 84 80 85 58 75 48 C 65 38 52 46 44 28 Z" fill="url(#stomachGrad_${expression})" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="48" cy="70" r="3" fill="#facc15" opacity="0.6"/>
        <circle cx="58" cy="65" r="2" fill="#facc15" opacity="0.6"/>
      `;
      break;
    case 'liver':
      organBody = `
        <defs>
          <linearGradient id="liverGrad_${expression}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <!-- Triangular Wedge Lobe -->
        <path d="M 22 36 C 35 24 70 24 84 38 C 88 46 84 62 76 72 C 60 78 30 76 20 62 C 16 52 18 42 22 36 Z" fill="url(#liverGrad_${expression})" stroke="#ffffff" stroke-width="2.5"/>
        <!-- Gallbladder peek -->
        <ellipse cx="62" cy="74" rx="6" ry="4" fill="#22c55e" stroke="#fff" stroke-width="1.5"/>
      `;
      break;
    case 'kidneys':
      organBody = `
        <defs>
          <linearGradient id="kidneyGrad_${expression}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <!-- Left bean -->
        <path d="M 34 32 C 22 32 20 68 34 76 C 42 76 38 60 38 54 C 38 48 42 32 34 32 Z" fill="url(#kidneyGrad_${expression})" stroke="#ffffff" stroke-width="2"/>
        <!-- Right bean -->
        <path d="M 66 32 C 78 32 80 68 66 76 C 58 76 62 60 62 54 C 62 48 58 32 66 32 Z" fill="url(#kidneyGrad_${expression})" stroke="#ffffff" stroke-width="2"/>
        <!-- Ureters -->
        <path d="M 37 56 Q 45 74 46 86" stroke="#eab308" stroke-width="2" fill="none"/>
        <path d="M 63 56 Q 55 74 54 86" stroke="#eab308" stroke-width="2" fill="none"/>
      `;
      break;
    default:
      organBody = `<circle cx="50" cy="50" r="35" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    ${organBody}
    ${eyes}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const getDefaultCharacters = (projectId: string): Character[] => [
  {
    id: `char-brain-${projectId}`,
    projectId,
    name: 'Dr. Synapse (Brain)',
    organType: 'brain',
    colorBadge: '#ec4899',
    personality: 'Hyper-analytical, intellectual, talks with quick wit, easily overwhelmed by caffeine or stress.',
    voiceProfile: {
      voiceType: 'Fast-paced, high intellectual clarity, academic enthusiasm',
      pitch: 'Mid-high',
      speakingRate: '1.15x',
      description: 'Sounds like an energetic science professor with dramatic comedic pauses.',
    },
    promptConsistencyPrefix: 'Stylized 3D Pixar character Dr. Synapse the human brain, glowing pink bioluminescent gyri, wearing tiny golden spectacles, lively big expressive eyes, octane render, volumetric studio lighting',
    poses: [
      {
        id: 'pose-brain-neutral',
        name: 'Neutral / lecturing',
        expression: 'neutral',
        description: 'Observant, focused, ready to coordinate impulses.',
        imageUrl: createOrganSvg('brain', 'neutral', '#f43f5e', '#fb7185'),
        isDefault: true,
      },
      {
        id: 'pose-brain-thinking',
        name: 'Calculating / Eureka',
        expression: 'thinking',
        description: 'Synaptic sparks flying, deep analytical concentration.',
        imageUrl: createOrganSvg('brain', 'thinking', '#ec4899', '#f472b6'),
      },
      {
        id: 'pose-brain-excited',
        name: 'Caffeine Overdrive',
        expression: 'excited',
        description: 'Neurons firing in dazzling patterns, enthusiastic grin.',
        imageUrl: createOrganSvg('brain', 'excited', '#e11d48', '#f43f5e'),
      },
      {
        id: 'pose-brain-panicked',
        name: 'Sleep Deprivation Alert',
        expression: 'panicked',
        description: 'Wide shock eyes, emergency synapses flashing red alert.',
        imageUrl: createOrganSvg('brain', 'panicked', '#be123c', '#e11d48'),
      },
    ],
  },
  {
    id: `char-heart-${projectId}`,
    projectId,
    name: 'Captain Pulse (Heart)',
    organType: 'heart',
    colorBadge: '#ef4444',
    personality: 'Brave, tireless marathon runner, rhythm-obsessed athletic leader of the circulatory team.',
    voiceProfile: {
      voiceType: 'Booming, warm, upbeat motivator',
      pitch: 'Resonant Baritone',
      speakingRate: 'Dynamic (bpm synced)',
      description: 'Speaks with rhythmic cadence, like an encouraging athletic coach on the microphone.',
    },
    promptConsistencyPrefix: 'Stylized 3D Pixar hero character Captain Pulse the human heart, deep crimson glossy muscle, athletic golden sweatband, muscular ventricles, energetic rhythmic pulse glow, 3D character design',
    poses: [
      {
        id: 'pose-heart-neutral',
        name: 'Steady 72 BPM',
        expression: 'neutral',
        description: 'Rhythmic, calm, pumping blood efficiently.',
        imageUrl: createOrganSvg('heart', 'neutral', '#dc2626', '#ef4444'),
        isDefault: true,
      },
      {
        id: 'pose-heart-excited',
        name: 'Adrenaline Rush (140 BPM)',
        expression: 'excited',
        description: 'Flexing ventricles, vibrant glowing aorta, triumphant smile.',
        imageUrl: createOrganSvg('heart', 'excited', '#b91c1c', '#dc2626'),
      },
      {
        id: 'pose-heart-thinking',
        name: 'Pacing the Tempo',
        expression: 'thinking',
        description: 'Listening closely to arterial pressure gauges.',
        imageUrl: createOrganSvg('heart', 'thinking', '#991b1b', '#b91c1c'),
      },
      {
        id: 'pose-heart-panicked',
        name: 'Cardio Overload',
        expression: 'panicked',
        description: 'Breathless, sweating droplets, clutching chest valves.',
        imageUrl: createOrganSvg('heart', 'panicked', '#7f1d1d', '#991b1b'),
      },
    ],
  },
  {
    id: `char-lungs-${projectId}`,
    projectId,
    name: 'The Respiro Twins (Lungs)',
    organType: 'lungs',
    colorBadge: '#06b6d4',
    personality: 'Breezy, tranquil, rhythmic yoga instructors who love fresh O2 and panic around dust and vape smoke.',
    voiceProfile: {
      voiceType: 'Smooth, soothing twin harmony, airy whispering presence',
      pitch: 'Light Tenor / Alto',
      speakingRate: '0.95x breathy',
      description: 'Calm, meditative voice with gentle exhale sounds between phrases.',
    },
    promptConsistencyPrefix: 'Stylized 3D character The Respiro Twins, spongy airy translucent cyan-blue lungs, tree-like bronze bronchioles branching gracefully, big bright friendly eyes, studio lighting',
    poses: [
      {
        id: 'pose-lungs-neutral',
        name: 'Deep Inhale',
        expression: 'neutral',
        description: 'Balanced alveoli exchange, tranquil presence.',
        imageUrl: createOrganSvg('lungs', 'neutral', '#0891b2', '#06b6d4'),
        isDefault: true,
      },
      {
        id: 'pose-lungs-excited',
        name: 'Pure Mountain Oxygen',
        expression: 'excited',
        description: 'Fully inflated with joyful breezy radiance.',
        imageUrl: createOrganSvg('lungs', 'excited', '#0e7490', '#0891b2'),
      },
      {
        id: 'pose-lungs-panicked',
        name: 'Asthma Constriction Alert',
        expression: 'panicked',
        description: 'Gasping for airflow, constricted bronchioles.',
        imageUrl: createOrganSvg('lungs', 'panicked', '#155e75', '#0e7490'),
      },
    ],
  },
  {
    id: `char-stomach-${projectId}`,
    projectId,
    name: 'Chef Acidus (Stomach)',
    organType: 'stomach',
    colorBadge: '#eab308',
    personality: 'Dramatic culinary critic, passionate blender of proteins, constantly complaining about junk food quality.',
    voiceProfile: {
      voiceType: 'Grumpy gourmet chef, theatrical Italian-French accent',
      pitch: 'Gruff Mid-Bass',
      speakingRate: '1.05x punctuated',
      description: 'Grumbling, expressive culinary artist who takes chemical digestion very personally.',
    },
    promptConsistencyPrefix: 'Stylized 3D character Chef Acidus the human stomach, curvy J-shaped golden-amber organ, wearing a tiny white chef hat, bubbling emerald-gold digestive churn, expressive facial features',
    poses: [
      {
        id: 'pose-stomach-neutral',
        name: 'Simmering Gastric Soup',
        expression: 'neutral',
        description: 'Stirring gastric juices with calm professionalism.',
        imageUrl: createOrganSvg('stomach', 'neutral', '#ca8a04', '#eab308'),
        isDefault: true,
      },
      {
        id: 'pose-stomach-excited',
        name: 'Nutrient Feast Incoming',
        expression: 'excited',
        description: 'Eagerly preparing hydrochloric acid for a healthy balanced meal.',
        imageUrl: createOrganSvg('stomach', 'excited', '#a16207', '#ca8a04'),
      },
      {
        id: 'pose-stomach-panicked',
        name: 'Acid Reflux Meltdown',
        expression: 'panicked',
        description: 'Overloaded with spicy greasy junk food, belching smoke.',
        imageUrl: createOrganSvg('stomach', 'panicked', '#854d0e', '#a16207'),
      },
    ],
  },
  {
    id: `char-liver-${projectId}`,
    projectId,
    name: 'Commander Detox (Liver)',
    organType: 'liver',
    colorBadge: '#d97706',
    personality: 'Stoic, tireless bio-chemical engineer running 500 bodily factories simultaneously without taking a day off.',
    voiceProfile: {
      voiceType: 'Steady, deep military commander, dependable and gravelly',
      pitch: 'Deep Bass',
      speakingRate: '1.0x steady',
      description: 'Sounds like a seasoned space station engineer dealing with hazardous waste filtration.',
    },
    promptConsistencyPrefix: 'Stylized 3D character Commander Detox the liver, reddish-bronze wedge shape with high-tech glowing chemical filtration conduits, rugged dependable expression, Pixar style character',
    poses: [
      {
        id: 'pose-liver-neutral',
        name: 'Normal Metabolism Mode',
        expression: 'neutral',
        description: 'Processing glucose, storing glycogen, neutralizing mild toxins.',
        imageUrl: createOrganSvg('liver', 'neutral', '#b45309', '#d97706'),
        isDefault: true,
      },
      {
        id: 'pose-liver-thinking',
        name: 'Complex Toxin Breakdown',
        expression: 'thinking',
        description: 'Analyzing foreign chemical compound before neutralising.',
        imageUrl: createOrganSvg('liver', 'thinking', '#92400e', '#b45309'),
      },
      {
        id: 'pose-liver-panicked',
        name: 'Toxic Overload Warning',
        expression: 'panicked',
        description: 'Sirens blaring across cellular filtration bays.',
        imageUrl: createOrganSvg('liver', 'panicked', '#78350f', '#92400e'),
      },
    ],
  },
  {
    id: `char-kidneys-${projectId}`,
    projectId,
    name: 'The Nephron Duo (Kidneys)',
    organType: 'kidneys',
    colorBadge: '#8b5cf6',
    personality: 'Obsessive cleanliness freaks, master hydration balance accountants, always chanting "DRINK MORE WATER!".',
    voiceProfile: {
      voiceType: 'Chirpy, quick-talking dual audit inspectors',
      pitch: 'Mid-Treble',
      speakingRate: '1.2x snappy',
      description: 'Sounds like hyper-efficient laboratory technicians checking electrolyte salinity spreadsheets.',
    },
    promptConsistencyPrefix: 'Stylized 3D character The Nephron Duo twin kidney beans, glossy purple-ruby bean-shaped bodies, holding tiny gold pressure gauges, crystal-clear water drops, Pixar-style animation',
    poses: [
      {
        id: 'pose-kidneys-neutral',
        name: 'Optimal Electrolyte Balance',
        expression: 'neutral',
        description: 'Filtering 50 gallons of plasma with pristine precision.',
        imageUrl: createOrganSvg('kidneys', 'neutral', '#7c3aed', '#8b5cf6'),
        isDefault: true,
      },
      {
        id: 'pose-kidneys-excited',
        name: 'Crisp Cold Water Rush',
        expression: 'excited',
        description: 'Cheering at clean hydration entering the renal tubules.',
        imageUrl: createOrganSvg('kidneys', 'excited', '#6d28d9', '#7c3aed'),
      },
      {
        id: 'pose-kidneys-panicked',
        name: 'Severe Dehydration Crisis',
        expression: 'panicked',
        description: 'Struggling with concentrated salts, yelling for water.',
        imageUrl: createOrganSvg('kidneys', 'panicked', '#5b21b6', '#6d28d9'),
      },
    ],
  },
];
