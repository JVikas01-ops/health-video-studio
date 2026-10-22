# Health Video Studio 🎬🫀🧠

**AI-Powered Health & Biology Video Production Studio** featuring human organs as expressive characters (Dr. Synapse the Brain, Captain Pulse the Heart, The Respiro Twins Lungs, Chef Acidus Stomach, Commander Detox Liver, and The Nephron Duo Kidneys).

---

## 🚀 Technology Stack
- **Framework:** React 19 + TypeScript
- **Bundler & Dev Server:** Vite 8
- **Styling:** Tailwind CSS v4 (Custom Dark-themed Video Production Aesthetic)
- **Icons:** Lucide React
- **Persistence:** Local IndexedDB (`idb-keyval`) with LocalStorage fallback (stores scripts, transparent PNGs, audio recordings, and video clips)

---

## 🎯 Core Features Implemented

### 1. Project Dashboard
- Create, duplicate, switch, and delete multiple health video projects.
- Visual production progress tracker (completion percentage, approved shots counter).
- Production specification configuration (Aspect Ratio `16:9`, `9:16`, `1:1`, Video FPS, Target Audience, Visual Style).
- Scene & shot pipeline overview with quick navigation.

### 2. Story & Script Studio
- **Health Topic Narrative Engine:** Built-in biological story generation with verified narratives (*Caffeine Rush*, *The Great Pizza Odyssey*, *Cellular Fortress Flu Invasion*, *Dehydration Shock*), plus custom health topic generation.
- **Organ Cast Dialogue:** Pre-configured and customizable lines for Brain, Heart, Lungs, Stomach, Liver, and Kidneys.
- **Dual View Modes:**
  - *Screenplay View:* Formatted classic screenplay layout with sluglines, scene headings, and centered character dialogue.
  - *Shot List View:* Direct inline dialogue line editing, speaker reassignment, voice delivery notes, and scene management.

### 3. Character Asset Manager
- **Transparent PNG Import:** Upload and store transparent PNG character images with alpha channel verification.
- **Expression & Pose Rigging:** Store multiple poses per organ (*Neutral, Excited, Panicked, Thinking, Exhausted, Victorious*).
- **Interactive Checkered Lightbox Preview:** Full-size preview of alpha transparency.
- **Prompt Consistency Engine:** Per-character visual prompt prefixes for Midjourney & FLUX.
- **Voice Profiles:** Character vocal delivery notes for ElevenLabs / TTS synthesis.

### 4. Scene & Shot Manager
- Hierarchical division of stories into Scenes and individual Shots.
- Dynamic character assignment per shot.
- Shot framing types (*Extreme Wide, Wide, Medium, Close-up, Macro ECU, Tracking, Dolly Zoom, POV*).
- Camera motion instructions and visual action descriptions.
- One-click copy buttons for external AI generators.
- Shot lifecycle management (*Planned ➔ In Progress ➔ Generated ➔ Approved*).

### 5. Audio Studio
- Shot-level audio association.
- **Built-in Microphone Recorder:** Record voiceover dialogue directly in the browser and attach it to individual shots.
- Local audio file uploader (MP3, WAV, WebM).
- Sound Effects (SFX) library with sound-design prompts and playback.
- Background music motif tracking and prompt export.

### 6. Video Generation Manager
- External AI video generation prompt management (Runway Gen-3, Luma Dream Machine, Kling AI, Pika, Sora).
- Attach generated video clips (MP4, WebM) and storyboard frames to individual shots.
- Full video player with loop, controls, and shot file download.
- **Discrete Shot Policy:** Each shot is stored and managed as an independent video clip; automatic combination into one final video is strictly disabled in compliance with project rules.

### 7. Export & File Management
- **Full Project JSON Export / Import:** Instant state backup and restoration.
- **Production Shot List CSV:** Spreadsheet format compatible with Excel and Google Sheets.
- **Screenplay Markdown (`.md`):** Printable formatted script documentation.
- **Batch Prompt Sheet (`.txt`):** Organized list of all Midjourney and Runway prompts.
- Virtual project file directory tree (`/scripts/`, `/characters/`, `/shots/prompts/`, `/audio/`, `/videos/`).

### 8. Modular AI Engine Connectors
- Runs 100% locally and offline out-of-the-box using the built-in biological story engine.
- Optional Bring-Your-Own-Key (BYOK) connectors for Google Gemini, OpenAI, ElevenLabs, and Runway.

---

## 🛠️ Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   Open `http://127.0.0.1:5173/` in your browser.

### Connect the Studio to your signed-in Gemini website (no API key)

1. Open the Studio address in **Google Chrome**.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, and click **Load unpacked**.
3. Select this project's `gemini-companion` folder (inside `health videos`).
4. Copy the companion's **ID** shown by Chrome.
5. Open the Gemini assistant in the Studio, open the connection help, and paste that ID into **Chrome companion Extension ID**.
6. In Chrome, sign in to `https://gemini.google.com` and keep that tab open. The Studio should show **Gemini Connected**.

The companion sends prompts through the visible Gemini page. It does not use an API key or read cookies/passwords. Image/video controls can vary by Gemini account and page changes; if Gemini does not expose the feature or attachment to the companion, the Studio will show an error and may require you to attach the image manually.

3. **Build production bundle:**
   ```bash
   npm run build
   ```
