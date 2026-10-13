// Native canvas capture only: no camera, microphone, screen permission or upload.
// MP4 muxing is available in recent Chromium/Safari; support is checked at runtime.
// https://developer.chrome.com/release-notes/126#mp4_container_support_for_mediarecorder
const MIME_TYPES = [
  'video/mp4;codecs=avc1', 'video/mp4;codecs=avc1.42E028', 'video/mp4',
  'video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm',
];
const limit = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
const formatFor = mime => /video\/mp4/i.test(mime || '') ? 'MP4' : /video\/webm/i.test(mime || '') ? 'WebM' : '';
const safeCall = (callback, value) => { try { callback?.(value); } catch { /* UI callbacks must not leak a live encoder. */ } };

export function getSceneRecordingSupport(canvas, Recorder = globalThis.MediaRecorder) {
  const mimeTypes = typeof Recorder?.isTypeSupported === 'function'
    ? MIME_TYPES.filter(type => { try { return Recorder.isTypeSupported(type); } catch { return false; } }) : [];
  const supported = Boolean(canvas && typeof canvas.captureStream === 'function' && mimeTypes.length);
  const mimeType = supported ? mimeTypes[0] : '';
  const format = formatFor(mimeType);
  return {
    supported, mimeType, format, extension: format ? format.toLowerCase() : '', mimeTypes,
    fallback: format === 'WebM',
    message: !supported ? 'L’enregistrement vidéo n’est pas disponible dans ce navigateur.'
      : format === 'MP4' ? 'Vidéo MP4, sans son, 30 secondes maximum.'
        : 'Ce navigateur enregistre en WebM ; le fichier ne sera pas un MP4.',
  };
}

export function sceneRecordingFilename(name, extension, date = new Date()) {
  const slug = String(name || 'ambiance').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 65) || 'ambiance';
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `grand-remix-${slug}-${stamp}.${extension === 'mp4' ? 'mp4' : 'webm'}`;
}

// Verify the actual container rather than simply renaming a WebM file to .mp4.
async function recordedContainer(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (bytes.length >= 8 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') return 'MP4';
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'WebM';
  throw new Error('Le navigateur n’a pas produit un fichier vidéo MP4 ou WebM valide.');
}

/**
 * start({name, durationSeconds, autoDownload}) -> boolean
 * stop() -> Promise<result|null>; download() downloads the latest completed result.
 * onState({status,message,elapsedSeconds,durationSeconds,format,...}) drives the UI/toast.
 * onComplete({blob,url,filename,format,mimeType,sizeBytes,durationSeconds,...}) fires once.
 * `environment` is an optional test seam; ordinary callers should omit it.
 */
export function createSceneRecorder({
  canvas, onState, onError, onComplete, maxDurationSeconds = 30, frameRate = 30,
  videoBitsPerSecond = 4_000_000, environment = globalThis,
} = {}) {
  const env = environment;
  const Recorder = env.MediaRecorder;
  const BlobType = env.Blob || Blob;
  const clock = () => env.performance?.now?.() ?? Date.now();
  const setTimer = (fn, ms) => env.setTimeout(fn, ms);
  const clearTimer = id => { if (id !== null) env.clearTimeout(id); };
  const maxSeconds = limit(maxDurationSeconds, 30, 1, 240);
  const fps = limit(frameRate, 30, 12, 30);
  const bitrate = Math.round(limit(videoBitsPerSecond, 4_000_000, 1_000_000, 8_000_000));
  let disposed = false, active = null, latest = null;
  let state = {status: 'idle', message: '', elapsedSeconds: 0, durationSeconds: 0, format: ''};
  const emit = next => { state = {...state, ...next}; safeCall(onState, {...state}); };
  const current = s => !disposed && active === s;
  const getSupport = () => getSceneRecordingSupport(canvas, Recorder);
  function releaseLatest() {
    if (latest?.url) env.URL?.revokeObjectURL?.(latest.url);
    latest = null;
  }
  function clearSession(s) {
    clearTimer(s.tickTimer); clearTimer(s.limitTimer); clearTimer(s.finishTimer);
    s.tickTimer = s.limitTimer = s.finishTimer = null;
    env.document?.removeEventListener?.('visibilitychange', s.onHidden);
    canvas?.removeEventListener?.('webglcontextlost', s.onContextLost);
    for (const track of s.stream?.getTracks?.() || []) {
      track.removeEventListener?.('ended', s.onTrackEnded);
      try { track.stop(); } catch { /* This stream belongs solely to this recorder. */ }
    }
    if (s.recorder) s.recorder.ondataavailable = s.recorder.onstop = s.recorder.onerror = null;
  }
  function fail(s, cause) {
    if (s && !current(s)) return;
    const error = cause instanceof Error ? cause : new Error(String(cause || 'Enregistrement impossible.'));
    if (s) {
      active = null;
      clearSession(s);
      try { if (s.recorder?.state !== 'inactive') s.recorder?.stop(); } catch { /* Already stopped. */ }
      s.chunks.length = 0;
      s.resolve(null);
    }
    emit({status: 'error', message: error.message});
    safeCall(onError, error);
  }
  function download() {
    if (disposed || !latest?.url || !env.document?.createElement) return false;
    const anchor = env.document.createElement('a');
    anchor.href = latest.url; anchor.download = latest.filename; anchor.style.display = 'none';
    try {
      env.document.body?.appendChild(anchor);
      anchor.click();
      return true;
    } catch (error) {
      safeCall(onError, error);
      return false;
    } finally { anchor.remove?.(); }
  }
  async function complete(s) {
    if (!current(s) || s.finalizing) return;
    s.finalizing = true;
    s.stoppedAt ??= clock();
    clearSession(s);
    try {
      if (!s.bytes) throw new Error('Aucune image enregistrée. Relancez la scène puis réessayez.');
      let blob = new BlobType(s.chunks, {type: s.recorder.mimeType || s.mimeType});
      s.chunks.length = 0;
      const format = await recordedContainer(blob);
      if (!current(s)) return;
      const extension = format.toLowerCase(), mimeType = `video/${extension}`;
      if (blob.type !== mimeType) blob = new BlobType([blob], {type: mimeType});
      const url = env.URL.createObjectURL(blob);
      latest = {blob, url, format, extension, mimeType, filename: sceneRecordingFilename(s.name, extension),
        sizeBytes: blob.size, durationSeconds: Math.max(0, (s.stoppedAt - s.startedAt) / 1000),
        width: s.width, height: s.height, frameRate: fps, name: s.name};
      active = null;
      const result = latest;
      emit({status: 'ready', format, elapsedSeconds: result.durationSeconds,
        message: `${format} prêt · ${(blob.size / 1_000_000).toFixed(1)} Mo · sans son${format === 'WebM' ? ' (MP4 non disponible)' : ''}.`});
      if (s.autoDownload) download();
      s.resolve(result);
      safeCall(onComplete, result);
    } catch (error) { fail(s, error); }
  }
  function stop() {
    if (!active) return Promise.resolve(latest);
    const s = active;
    if (state.status === 'stopping' || s.finalizing) return s.done;
    s.stoppedAt = clock();
    clearTimer(s.tickTimer); clearTimer(s.limitTimer);
    emit({status: 'stopping', message: 'Préparation du fichier vidéo…', elapsedSeconds: (s.stoppedAt - s.startedAt) / 1000});
    s.finishTimer = setTimer(() => fail(s, new Error('Le navigateur n’a pas terminé la vidéo. Réessayez avec une séquence plus courte.')), 8000);
    try {
      // Inactive can precede the queued final dataavailable/onstop events.
      if (s.recorder.state !== 'inactive') s.recorder.stop();
    } catch (error) { fail(s, error); }
    return s.done;
  }
  function start({name = 'Ambiance', durationSeconds = maxSeconds, autoDownload = false} = {}) {
    if (disposed || active) return false;
    const support = getSupport();
    if (!support.supported) { fail(null, new Error(support.message)); return false; }
    if (!canvas.width || !canvas.height) { fail(null, new Error('La vue 3D n’est pas encore prête.')); return false; }
    releaseLatest();
    const s = {name: String(name).slice(0, 120), duration: limit(durationSeconds, maxSeconds, 1, maxSeconds),
      autoDownload: Boolean(autoDownload), width: canvas.width, height: canvas.height,
      chunks: [], bytes: 0, tickTimer: null, limitTimer: null, finishTimer: null};
    s.done = new Promise(resolve => { s.resolve = resolve; });
    active = s;
    emit({status: 'starting', elapsedSeconds: 0, durationSeconds: s.duration, message: 'Préparation de l’enregistrement…'});
    if (!current(s)) return false;
    try {
      s.stream = canvas.captureStream(fps);
      const tracks = s.stream.getTracks();
      if (!tracks.length || tracks.some(track => track.kind !== 'video')) throw new Error('La capture doit contenir uniquement la vue 3D, sans audio.');
      let lastError;
      for (const mimeType of support.mimeTypes) {
        try {
          const recorder = new Recorder(s.stream, {mimeType, videoBitsPerSecond: bitrate});
          s.recorder = recorder; s.mimeType = mimeType;
          recorder.ondataavailable = event => {
            if (!current(s) || !event.data?.size) return;
            s.chunks.push(event.data); s.bytes += event.data.size;
            if (s.bytes > Math.min(256 * 1024 * 1024, Math.max(64 * 1024 * 1024, s.duration * bitrate / 8 * 1.4))) fail(s, new Error('Cette capture dépasse la taille prévue. Essayez une séquence plus courte.'));
          };
          recorder.onstop = () => { void complete(s); };
          recorder.onerror = event => fail(s, event.error || new Error('Le navigateur a interrompu l’encodage vidéo.'));
          s.startedAt = clock();
          recorder.start(1000);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (s.recorder) {
            s.recorder.ondataavailable = s.recorder.onstop = s.recorder.onerror = null;
            try { if (s.recorder.state !== 'inactive') s.recorder.stop(); } catch { /* Try the next supported codec. */ }
          }
          s.chunks.length = 0; s.bytes = 0;
        }
      }
      if (lastError) throw lastError;
      if (!current(s)) return false;
      const format = formatFor(s.recorder.mimeType || s.mimeType);
      s.onHidden = () => { if (env.document.hidden && current(s)) void stop(); };
      s.onContextLost = () => fail(s, new Error('La vue 3D a été interrompue ; la capture a été arrêtée.'));
      s.onTrackEnded = () => { if (current(s)) void stop(); };
      env.document?.addEventListener?.('visibilitychange', s.onHidden);
      canvas.addEventListener?.('webglcontextlost', s.onContextLost);
      for (const track of tracks) track.addEventListener?.('ended', s.onTrackEnded);
      const tick = () => {
        if (!current(s) || s.stoppedAt !== undefined) return;
        const elapsedSeconds = Math.max(0, (clock() - s.startedAt) / 1000);
        if (elapsedSeconds >= s.duration) { void stop(); return; }
        emit({status: 'recording', format, elapsedSeconds,
          message: `Enregistrement ${format} · ${Math.floor(elapsedSeconds)} / ${s.duration} s · sans son${format === 'WebM' ? ' (MP4 non disponible)' : ''}.`});
        s.tickTimer = setTimer(tick, 250);
      };
      s.limitTimer = setTimer(() => { if (current(s)) void stop(); }, s.duration * 1000);
      tick();
      return true;
    } catch (error) {
      if (error?.name === 'SecurityError') fail(s, new Error('Une ressource vidéo empêche la capture de la vue 3D. Rechargez le site puis réessayez.'));
      else fail(s, error);
      return false;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (active) {
      const s = active; active = null;
      clearSession(s);
      try { if (s.recorder?.state !== 'inactive') s.recorder?.stop(); } catch { /* Discard an unfinished capture. */ }
      s.chunks.length = 0; s.resolve(null);
    }
    releaseLatest();
    emit({status: 'disposed', message: ''});
  }
  return {start, stop, download, dispose, getSupport, getState: () => ({...state}), getResult: () => latest};
}
