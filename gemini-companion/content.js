// Gemini changes its internal markup periodically. Support the current custom
// elements and data attributes as well as the older class name.
const RESPONSE_SELECTOR = [
  'model-response',
  'message-content',
  '[data-message-author-role="model"]',
  '[data-test-id="model-response"]',
  '[class*="model-response-message-content"]',
].join(',');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getComposer() {
  return document.querySelector('rich-textarea [contenteditable="true"]') ||
    document.querySelector('textarea') ||
    document.querySelector('[contenteditable="true"]');
}

function getButtons() {
  return Array.from(document.querySelectorAll('button,[role="button"],[role="menuitem"]'));
}

async function selectGeminiMode(mode) {
  const activeMode = getButtons().find((button) => {
    const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`.toLowerCase();
    return label.startsWith('close ') && (label.includes('video') || label.includes('image'));
  });

  if (mode === 'chat') {
    if (activeMode) activeMode.click();
    await delay(250);
    return;
  }

  const wanted = mode === 'video' ? 'video' : 'image';
  if (activeMode && activeMode.getAttribute('aria-label')?.toLowerCase().includes(wanted)) return;

  const uploadMenu = getButtons().find((button) =>
    (button.getAttribute('aria-label') || '').toLowerCase().includes('upload & tools')
  );
  if (!uploadMenu) throw new Error('Gemini upload and tools menu was not found.');
  uploadMenu.click();
  await delay(250);

  const option = getButtons().find((button) =>
    (button.textContent || '').trim().toLowerCase() === `create ${wanted}`
  );
  if (!option) throw new Error(`Gemini's Create ${wanted} option is unavailable.`);
  option.click();
  await delay(500);
}

function dataUrlToFile(dataUrl, filename) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('The scene image is not a supported image file.');
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return new File([bytes], filename, { type: match[1] });
}

async function attachReferenceImage(imageUrl) {
  let dataUrl = imageUrl;
  if (!dataUrl.startsWith('data:')) {
    const response = await fetch(imageUrl, { credentials: 'include' });
    if (!response.ok) throw new Error('Could not read the scene image for Gemini.');
    const blob = await response.blob();
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not prepare the scene image.'));
      reader.readAsDataURL(blob);
    });
  }

  // Keep Gemini's image-to-video upload light, including images made before
  // the Studio began storing compressed copies.
  const sourceBlob = await (await fetch(dataUrl)).blob();
  const sourceBitmap = await createImageBitmap(sourceBlob);
  try {
    dataUrl = await compressImageSource(sourceBitmap);
  } finally {
    sourceBitmap.close();
  }

  let input = document.querySelector('input[type="file"]');
  if (!input) {
    const uploadMenu = getButtons().find((button) =>
      (button.getAttribute('aria-label') || '').toLowerCase().includes('upload & tools')
    );
    uploadMenu?.click();
    await delay(200);
    const filesOption = getButtons().find((button) => (button.textContent || '').trim() === 'Files');
    filesOption?.click();
    for (let attempt = 0; attempt < 20 && !input; attempt += 1) {
      await delay(100);
      input = document.querySelector('input[type="file"]');
    }
  }
  if (!input) {
    throw new Error('Gemini did not expose a file input. Attach the scene image in Gemini, then retry.');
  }

  const extension = dataUrl.toLowerCase().startsWith('data:image/jpeg') ? 'jpg' : 'png';
  const file = dataUrlToFile(dataUrl, `scene-reference.${extension}`);
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const hasPreview = Array.from(document.querySelectorAll('img')).some((image) =>
      image.alt?.toLowerCase().includes('uploaded image') ||
      image.alt?.toLowerCase().includes('attachment')
    );
    if (hasPreview) return;
    await delay(200);
  }
  throw new Error('Gemini did not confirm the reference image upload.');
}

function setComposerText(input, text) {
  input.focus();
  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(input, text);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  } else {
    input.replaceChildren(document.createTextNode(text));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }
}

function responseMedia(card) {
  const images = Array.from((card || document).querySelectorAll('img[src]'))
    .filter((image) => image.naturalWidth >= 200 || image.width >= 300)
    .map((image) => image.currentSrc || image.src)
    .filter((url) => url && !url.startsWith('data:image/svg'));
  const videos = Array.from((card || document).querySelectorAll('video[src],video source[src]'))
    .map((video) => video.currentSrc || video.src)
    .filter(Boolean);
  return { images: [...new Set(images)], videos: [...new Set(videos)] };
}

async function readLatestResponse() {
  const cards = Array.from(document.querySelectorAll(RESPONSE_SELECTOR))
    .filter((element) => (element.innerText || '').trim().length > 0);
  const card = cards[cards.length - 1];
  const media = responseMedia(card || document);
  if (!media.images.length) media.images = responseMedia(document).images;
  if (!media.videos.length) media.videos = responseMedia(document).videos;
  if (!card && !media.images.length) return { ok: false, error: 'No Gemini reply or image was found on this page yet.' };
  const imageUrl = media.images[media.images.length - 1];
  const imageData = imageUrl ? await imageAsDataUrl(imageUrl) : undefined;
  return { ok: true, text: (card?.innerText || '').trim(), ...media, imageData };
}

async function waitForResponse(previousCount, mode, previousImages, previousVideos) {
  let lastText = '';
  let stableSince = Date.now();
  const deadline = Date.now() + 240000;

  while (Date.now() < deadline) {
    const cards = Array.from(document.querySelectorAll(RESPONSE_SELECTOR))
      .filter((element) => (element.innerText || '').trim().length > 0);
    const card = cards.length > previousCount ? cards[cards.length - 1] : null;
    if (card || mode === 'image' || mode === 'video') {
      const text = (card?.innerText || '').trim();
      const media = responseMedia(card);
      const freshImages = responseMedia(document).images.filter((url) => !previousImages.has(url));
      const freshVideos = responseMedia(document).videos.filter((url) => !previousVideos.has(url));
      if (!media.images.length && freshImages.length) media.images = freshImages;
      if (!media.videos.length && freshVideos.length) media.videos = freshVideos;
      const lower = text.toLowerCase();
      if (/sorry,?\s+something went wrong|you.re out of videos|not available right now/.test(lower)) {
        return { ok: false, error: text || 'Gemini could not complete the request.', text, ...media };
      }

      if (text !== lastText) {
        lastText = text;
        stableSince = Date.now();
      }

      const generating = /generating your video|creating your image|working on it|gemini is typing/.test(lower) ||
        Boolean(document.querySelector('button[aria-label*="Stop response"],button[aria-label*="Stop generating"]'));
      const mediaReady = mode === 'video' ? (media.videos.length > 0 || lower.includes('your video is ready')) :
        mode === 'image' ? media.images.length > 0 : false;
      const textReady = mode === 'chat' && Boolean(card) && text.length > 0 && !generating && Date.now() - stableSince >= 1800;

      if (!generating && (mediaReady || textReady)) {
        const imageData = mode === 'image' && media.images[0] ? await imageAsDataUrl(media.images[0]) : undefined;
        return { ok: true, text, ...media, imageData };
      }
    }
    await delay(500);
  }
  return { ok: false, error: 'Gemini did not finish within four minutes. Check its tab for the current status.' };
}

async function imageAsDataUrl(url) {
  const image = Array.from(document.querySelectorAll('img[src]')).find((item) =>
    (item.currentSrc || item.src) === url
  );
  if (image) {
    try {
      return await compressImageSource(image);
    } catch {}
  }
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Gemini image appeared, but Studio could not save a reusable copy.');
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    return await compressImageSource(bitmap);
  } finally {
    bitmap.close();
  }
}

async function readMediaForExport(url) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Gemini media request failed (${response.status}).`);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ ok: true, dataUrl: reader.result, mimeType: blob.type });
    reader.onerror = () => reject(new Error('Could not read the Gemini media file.'));
    reader.readAsDataURL(blob);
  });
}

async function compressImageSource(source) {
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;
  const scale = Math.min(1, 1280 / sourceWidth, 1280 / sourceHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image compression failed.')), 'image/jpeg', 0.82);
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not prepare the compressed Gemini image.'));
    reader.readAsDataURL(blob);
  });
}

async function executePrompt(message) {
  if (!location.hostname.endsWith('gemini.google.com')) {
    return { ok: false, error: 'The selected tab is not Gemini.' };
  }
  await selectGeminiMode(message.mode || 'chat');
  if (message.imageUrl) await attachReferenceImage(message.imageUrl);

  const input = getComposer();
  if (!input) throw new Error('Gemini prompt box was not found. Open a Gemini chat and try again.');
  const previousCount = document.querySelectorAll(RESPONSE_SELECTOR).length;
  const previousMedia = responseMedia(document);
  const previousImages = new Set(previousMedia.images);
  const previousVideos = new Set(previousMedia.videos);
  setComposerText(input, message.prompt || '');
  await delay(150);

  const send = getButtons().find((button) => {
    const label = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`.toLowerCase();
    return label.includes('send message') || label === 'send';
  });
  if (!send || send.disabled) throw new Error('Gemini’s Send button is not available.');
  send.click();
  return waitForResponse(previousCount, message.mode || 'chat', previousImages, previousVideos);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ ok: true, title: document.title, url: location.href });
    return false;
  }
  if (message?.type === 'CAPTURE_LATEST_RESPONSE') {
    readLatestResponse()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Could not import Gemini’s latest reply.' }));
    return true;
  }
  if (message?.type === 'GET_MEDIA_DATA') {
    readMediaForExport(message.url)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Could not retrieve Gemini media.' }));
    return true;
  }
  if (message?.type !== 'EXECUTE_PROMPT') return false;

  executePrompt(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || 'Gemini automation failed.' }));
  return true;
});
