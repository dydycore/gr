// Screen width and a coarse pointer also describe desktop windows and touch PCs.
// Only identified phones/tablets use this lighter preview; exports keep full quality.
export function isMobileDevice(device = {}) {
 const ua = device.userAgent || '';
 return device.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(ua) ||
  (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
}

export function createRenderProfile(device = {}, { exporting = false } = {}) {
 const mobile = !exporting && isMobileDevice(device);
 return Object.freeze({
  mobile, exporting, antialias: !mobile,
  maxPixelRatio: mobile ? 1 : 2, maxPixels: mobile ? 720000 : 4800000,
  shadowSize: mobile ? 512 : 1024, sunShadowSize: mobile ? 1024 : 2048,
  visualSize: mobile ? 512 : 1024, goboSize: mobile ? 256 : 512,
  beamSegments: mobile ? 20 : 48
 });
}

export function previewPixelRatio(profile, width, height, devicePixelRatio = 1, scale = 1) {
 if (profile.exporting) return 1;
 return Math.min(devicePixelRatio || 1, profile.maxPixelRatio,
  Math.sqrt(profile.maxPixels / Math.max(1, width * height))) * (profile.mobile ? scale : 1);
}

// Lower only the 3D pixel count under sustained pressure. DOM text stays native.
// Hysteresis and a recovery margin prevent repeated resize/allocation churn.
export function createMobileQuality(enabled) {
 const scales = [1, .85, .7];
 let tier = 0, start = null, last = null, frames = 0, work = 0, target = 30;
 let bad = 0, good = 0, changedAt = -Infinity;
 function reset() { start = last = null; frames = work = bad = good = 0; }
 function record(now, workMs, fps = 30) {
  if (!enabled || !Number.isFinite(now) || !Number.isFinite(workMs) || workMs < 0) return false;
  if (fps !== target || last !== null && (now <= last || now - last > 2000)) reset();
  target = fps;
  if (start === null) { start = last = now; return false; }
  last = now; frames++; work += workMs;
  const duration = now - start;
  if (duration < 1800 || frames < 8) return false;
  const delivered = frames * 1000 / duration, average = work / frames;
  const overloaded = delivered < fps * .9 || average > 1000 / fps * .85;
  bad = overloaded ? bad + 1 : 0;
  good = !overloaded && delivered >= fps * .97 && average < 1000 / fps * .5 ? good + 1 : 0;
  start = now; frames = work = 0;
  let next = tier;
  if (bad >= 2 && now - changedAt >= 5000) next = Math.min(scales.length - 1, tier + 1);
  else if (good >= 5 && now - changedAt >= 18000) next = Math.max(0, tier - 1);
  if (next === tier) return false;
  tier = next; changedAt = now; reset(); return true;
 }
 return { get scale() { return enabled ? scales[tier] : 1; }, record, reset };
}
