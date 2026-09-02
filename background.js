// Gmail Always Ask Save As - v1.0.6 ULTRA-LIGHT
// Wakes ONLY on downloads.onCreated - no tabs listeners, no tabs permission
// Relies purely on referrer/url (proven reliable: referrer is always https://mail.google.com/)

console.log("[Gmail Save As] Service worker loaded v1.0.6 ultra-light");

const forcing = new Set();

function isGmailDownload(item) {
  const r = item.referrer || "";
  const u = item.url || "";
  return r.includes("mail.google.com") || 
         r.includes("gmail.com") || 
         u.includes("mail.google.com") || 
         u.includes("mail-attachment.googleusercontent.com");
}

chrome.downloads.onCreated.addListener(async (item) => {
  console.log(`[Gmail Save As] onCreated id=${item.id} filename="${item.filename}" referrer="${item.referrer}" url=${item.url.substring(0,120)}`);

  if (forcing.has(item.url)) {
    console.log(`[Gmail Save As] -> already forced, allowing`);
    forcing.delete(item.url);
    return;
  }

  if (!isGmailDownload(item)) {
    console.log(`[Gmail Save As] -> not Gmail`);
    return;
  }

  console.log(`[Gmail Save As] -> GMAIL, canceling ${item.id} and re-downloading with saveAs:true`);
  
  try { await chrome.downloads.cancel(item.id); } catch(e){}
  await new Promise(r => setTimeout(r, 150));

  forcing.add(item.url);
  try {
    const newId = await chrome.downloads.download({ url: item.url, saveAs: true });
    console.log(`[Gmail Save As] re-download newId=${newId}`);
  } catch(e) {
    console.error("[Gmail Save As] download() failed", e);
    forcing.delete(item.url);
  }
});
