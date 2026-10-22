const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1']);

function allowedSender(sender) {
  try {
    const url = new URL(sender.url || sender.origin || '');
    return url.protocol === 'http:' && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!allowedSender(sender)) {
    sendResponse({ ok: false, error: 'Only the local Health Video Studio can control this companion.' });
    return false;
  }

  if (message?.type === 'PING') {
    chrome.tabs.query({ url: 'https://gemini.google.com/*' }).then((tabs) => {
      const tab = tabs.find((candidate) => candidate.active) || tabs[0];
      if (!tab?.id) {
        sendResponse({ ok: true, connected: false, message: 'Open Gemini in Chrome and sign in.' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'PING' }).then((result) => {
        sendResponse({
          ok: true,
          connected: Boolean(result?.ok),
          tabTitle: tab.title || '',
          message: result?.ok ? 'Gemini page is ready.' : 'Reload the Gemini tab to connect the companion.',
        });
      }).catch(() => {
        sendResponse({ ok: true, connected: false, message: 'Reload the Gemini tab to connect the companion.' });
      });
    }).catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (!['EXECUTE_PROMPT', 'CAPTURE_LATEST_RESPONSE', 'GET_MEDIA_DATA'].includes(message?.type)) {
    sendResponse({ ok: false, error: 'Unsupported companion command.' });
    return false;
  }

  (async () => {
    const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
    const tab = tabs.find((candidate) => candidate.active) || tabs[0];
    if (!tab?.id) {
      sendResponse({ ok: false, error: 'Open your signed-in Gemini tab in Chrome first.' });
      return;
    }

    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        type: message.type,
        prompt: String(message.prompt || ''),
        mode: message.mode || 'chat',
        imageUrl: message.imageUrl || '',
        url: message.url || '',
      });
      sendResponse(result || { ok: false, error: 'Gemini did not return a result.' });
    } catch (error) {
      sendResponse({
        ok: false,
        error: 'Could not reach the Gemini page. Reload the Gemini tab after installing the companion, then reconnect.',
      });
    }
  })();
  return true;
});
