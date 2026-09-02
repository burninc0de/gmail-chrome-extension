// Gmail Always Ask Save As - v1.0.9 FIX startup spam
// Startup spam was from Chrome resuming 99 interrupted Gmail downloads
// from the previous loop crash. Fix: only handle FRESH downloads (started <3s ago)
// and rate-limit to 1 per 3 seconds.

console.log("[Gmail Save As] Service worker loaded v1.0.9 no-startup-spam");

let lastForcedAt = 0;
let lastForcedUrl = "";

function isGmailDownload(item) {
  const r = item.referrer || "";
  const u = item.url || "";
  try {
    if (r) {
      const rh = new URL(r).hostname;
      if (rh === "mail.google.com" || rh === "gmail.com" || rh.endsWith(".gmail.com")) return true;
    }
    if (u) {
      const uh = new URL(u).hostname;
      if (uh === "mail.google.com" || uh === "mail-attachment.googleusercontent.com") return true;
    }
  } catch(e) {}
  return r.includes("mail.google.com") || u.includes("mail.google.com") || u.includes("mail-attachment.googleusercontent.com");
}

chrome.downloads.onCreated.addListener(async (item) => {
  if (item.byExtensionId === chrome.runtime.id) return; // our own

  // Ignore old/resumed downloads from previous crash (startup spam)
  // Fresh Gmail clicks have startTime within ~1 sec
  try {
    const age = Date.now() - new Date(item.startTime).getTime();
    if (age > 3000) {
      console.log(`[Gmail Save As] IGNORED old/resumed download age=${age}ms id=${item.id}`);
      return;
    }
  } catch(e){}

  // Rate limit: max 1 prompt per 3 seconds
  const now = Date.now();
  if (now - lastForcedAt < 3000) {
    console.log(`[Gmail Save As] RATE LIMITED id=${item.id}`);
    return;
  }
  if (item.url === lastForcedUrl && (now - lastForcedAt) < 5000) return;

  if (!isGmailDownload(item)) return;

  console.log(`[Gmail Save As] GMAIL id=${item.id} "${item.filename}" -> prompting`);
  lastForcedUrl = item.url;
  lastForcedAt = now;

  try { await chrome.downloads.cancel(item.id); } catch(e){}
  await new Promise(r => setTimeout(r, 150));

  try {
    await chrome.downloads.download({ url: item.url, saveAs: true });
  } catch(e) { console.error(e); }
});
