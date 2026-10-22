/**
 * Local Studio Camera Motion Simulator
 * Generates an actual playable WebM video clip from an approved reference frame
 * by animating camera motion (push-in, pan, tilt, heartbeat pulse) on an HTML5 canvas
 * and recording frames via MediaRecorder.
 * 
 * 100% offline, deterministic, and non-destructive.
 */

export interface VideoSimulateOptions {
  imageUrl: string;
  cameraInstruction?: string;
  durationSec?: number;
  width?: number;
  height?: number;
}

export interface VideoSimulateResult {
  videoUrl: string;
  durationSec: number;
  provider: 'local_engine';
  model: string;
}

export const generateSimulatedCameraTake = async (
  options: VideoSimulateOptions
): Promise<VideoSimulateResult> => {
  const {
    imageUrl,
    cameraInstruction = 'Slow push in',
    durationSec = 4,
    width = 960,
    height = 540,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        const fps = 30;
        const totalFrames = fps * durationSec;
        let currentFrame = 0;

        // Determine motion profile from camera instruction
        const instructionLower = cameraInstruction.toLowerCase();
        const isPushIn = instructionLower.includes('push') || instructionLower.includes('in') || instructionLower.includes('zoom in');
        const isPullOut = instructionLower.includes('pull') || instructionLower.includes('out') || instructionLower.includes('wide');
        const isPanLeft = instructionLower.includes('pan left');
        const isPanRight = instructionLower.includes('pan right');
        const isHeartbeat = instructionLower.includes('pulse') || instructionLower.includes('beat') || instructionLower.includes('organ');

        // Check MediaRecorder support
        if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
          reject(new Error('Browser MediaRecorder or canvas captureStream not supported'));
          return;
        }

        // Determine supported mime type
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const stream = canvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const recordedChunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(videoBlob);
          resolve({
            videoUrl,
            durationSec,
            provider: 'local_engine',
            model: `Local Camera Motion Simulator (${mimeType})`,
          });
        };

        recorder.start();

        const renderFrame = () => {
          if (currentFrame > totalFrames) {
            recorder.stop();
            return;
          }

          const progress = currentFrame / totalFrames; // 0 to 1
          ctx.fillStyle = '#05070d';
          ctx.fillRect(0, 0, width, height);

          // Calculate transforms based on motion profile
          let scale = 1.0;
          let panX = 0;
          let panY = 0;

          if (isPushIn) {
            scale = 1.0 + progress * 0.18; // Zoom in up to 118%
          } else if (isPullOut) {
            scale = 1.18 - progress * 0.18; // Zoom out to 100%
          } else {
            scale = 1.05 + Math.sin(progress * Math.PI) * 0.05;
          }

          if (isPanRight) {
            panX = -progress * 60;
          } else if (isPanLeft) {
            panX = progress * 60;
          }

          // Subtle biological respiration pulse
          if (isHeartbeat) {
            const beat = Math.sin(progress * Math.PI * 4) * 0.03;
            scale += beat;
          }

          ctx.save();
          ctx.translate(width / 2 + panX, height / 2 + panY);
          ctx.scale(scale, scale);

          // Draw image centered
          const imgAspect = img.width / img.height;
          const canvasAspect = width / height;
          let drawW = width;
          let drawH = height;

          if (imgAspect > canvasAspect) {
            drawH = width / imgAspect;
          } else {
            drawW = height * imgAspect;
          }

          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();

          // Camera HUD Overlay (Cinema look)
          ctx.save();
          // Subtle vignette
          const gradient = ctx.createRadialGradient(
            width / 2,
            height / 2,
            width * 0.35,
            width / 2,
            height / 2,
            width * 0.65
          );
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          // Rec indicator & timestamp
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.beginPath();
          ctx.arc(36, 32, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('REC', 48, 36);

          const timecode = `00:00:0${Math.floor(progress * durationSec)}:${Math.floor((currentFrame % fps) * (100 / fps)).toString().padStart(2, '0')}`;
          ctx.fillText(timecode, width - 110, 36);

          // Motion prompt badge
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(26, height - 42, width - 52, 26);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '11px monospace';
          ctx.fillText(`CAM: ${cameraInstruction.toUpperCase()} | 30 FPS CINEMATIC`, 36, height - 25);

          ctx.restore();

          currentFrame++;
          requestAnimationFrame(renderFrame);
        };

        renderFrame();
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load reference image for video generation'));
    };

    img.src = imageUrl;
  });
};
