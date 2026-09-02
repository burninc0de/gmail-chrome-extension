// Gmail Always Ask Save As - v1.0.5 - FIX Invalid filename loop
let isCurrentTabGmail = false;
async function refreshActiveTabState() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const url = tabs[0]?.url || "";
    isCurrentTabGmail = url.includes("mail.google.com") || url.includes("gmail.com");
  } catch(e){}
}
chrome.tabs.onActivated.addListener(refreshActiveTabState);
chrome.tabs.onUpdated.addListener((t,c,tab)=>{ if(tab?.active) refreshActiveTabState(); });
chrome.windows.onFocusChanged.addListener(refreshActiveTabState);
refreshActiveTabState();
console.log("[Gmail Save As] Service worker loaded v1.0.5 FIX");

const forcing = new Set();

function isGmailDownload(item) {
  const r = item.referrer || "";
  const u = item.url || "";
  return r.includes("mail.google.com") || u.includes("mail.google.com") || u.includes("mail-attachment.googleusercontent.com") || isCurrentTabGmail;
}

// Don't use onDeterminingFilename to avoid conflict - let onCreated handle everything
// chrome.downloads.onDeterminingFilename.addListener(...)

chrome.downloads.onCreated.addListener(async (item) => {
  console.log(`[Gmail Save As] onCreated id=${item.id} filename="${item.filename}" url=${item.url.substring(0,120)}`);

  if (forcing.has(item.url)) {
    console.log(`[Gmail Save As] -> already forced, allowing (will prompt)`);
    forcing.delete(item.url);
    return;
  }

  refreshActiveTabState();

  if (!isGmailDownload(item)) {
    console.log(`[Gmail Save As] -> not Gmail`);
    return;
  }

  console.log(`[Gmail Save As] -> GMAIL, canceling ${item.id} and re-downloading with saveAs:true`);
  
  try { await chrome.downloads.cancel(item.id); } catch(e){}
  // Give Chrome a moment
  await new Promise(r => setTimeout(r, 150));

  // IMPORTANT: Do NOT pass filename - let Chrome derive it from Content-Disposition
  // Passing filename caused "Invalid filename" and empty filename loop
  forcing.add(item.url);
  try {
    const newId = await chrome.downloads.download({
      url: item.url,
      saveAs: true
      // no filename property
    });
    console.log(`[Gmail Save As] re-download newId=${newId} (should prompt)`);
  } catch(e) {
    console.error("[Gmail Save As] download() failed", e);
    forcing.delete(item.url);
  }
});
