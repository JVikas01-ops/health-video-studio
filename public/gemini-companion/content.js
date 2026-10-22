// Content script that runs on https://gemini.google.com/*
// Safely connects to the Health Video Studio tab via BroadcastChannel

console.log('[Gemini Companion] Active on gemini.google.com');

const bc = new BroadcastChannel('gemini_web_assistant_bridge');

// Send presence ping
bc.postMessage({
  type: 'COMPANION_READY',
  url: window.location.href,
  timestamp: Date.now(),
});

// Floating Status Pill in Gemini UI
const pill = document.createElement('div');
pill.id = 'hvs-gemini-companion-pill';
pill.style.position = 'fixed';
pill.style.bottom = '20px';
pill.style.right = '20px';
pill.style.zIndex = '9999999';
pill.style.pointerEvents = 'auto';
pill.innerHTML = `
  <div style="
    display: flex;
    align-items: center;
    gap: 8px;
    background: #090d16;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 9999px;
    border: 1px solid #0284c7;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
  ">
    <span style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; display: inline-block;"></span>
    <span>Health Video Studio Companion Connected</span>
  </div>
`;
document.body.appendChild(pill);

// Listen for Studio commands
bc.onmessage = (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'EXECUTE_PROMPT') {
    const promptText = data.payload?.prompt;
    if (!promptText) return;

    // Find Gemini prompt input
    const inputArea =
      document.querySelector('rich-textarea div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea');

    if (inputArea) {
      inputArea.focus();
      if (inputArea.tagName === 'TEXTAREA') {
        inputArea.value = promptText;
      } else {
        inputArea.innerText = promptText;
      }
      inputArea.dispatchEvent(new Event('input', { bubbles: true }));

      pill.innerHTML = `
        <div style="background: #064e3b; color: #a7f3d0; padding: 8px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; border: 1px solid #059669;">
          ✓ Prompt loaded into Gemini! Review & press Enter.
        </div>
      `;

      setTimeout(() => {
        pill.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; background: #090d16; color: #e2e8f0; padding: 8px 14px; border-radius: 9999px; border: 1px solid #0284c7;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; display: inline-block;"></span>
            <span>Health Video Studio Companion Connected</span>
          </div>
        `;
      }, 5000);
    }
  }

  if (data.type === 'PING') {
    bc.postMessage({
      type: 'PONG',
      url: window.location.href,
      timestamp: Date.now(),
    });
  }
};
