import {BufferTarget, EncodedPacket, EncodedVideoPacketSource, Mp4OutputFormat, Output} from 'mediabunny';
import {MAX_EXPORT_SECONDS} from './export-sequence.js';

// Offline timestamps, native H.264 encoding and a small, maintained JS MP4 muxer.
// https://mediabunny.dev/guide/media-sources#encodedvideopacketsource
const FPS = 30;
const MAX_SECONDS = 30;
const MAX_QUEUE = 4;
const bitRate = value => Number.isFinite(Number(value)) ? Math.max(2_000_000, Math.min(12_000_000, Number(value))) : 6_000_000;
const abortError = () => new DOMException('Création de la vidéo annulée.', 'AbortError');
const unsupportedError = message => Object.assign(new Error(message), {name: 'NotSupportedError', code: 'OFFLINE_EXPORT_UNSUPPORTED'});
function checkAbort(signal) { if (signal?.aborted) throw abortError(); }
function abortable(promise, signal) {
  if (!signal) return Promise.resolve(promise);
  if (signal.aborted) { Promise.resolve(promise).catch(() => {}); return Promise.reject(abortError()); }
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(abortError()); };
    signal.addEventListener('abort', abort, {once: true});
    Promise.resolve(promise).then(value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}

export function offlineSceneTiming(durationSeconds = 30, maxDurationSeconds = MAX_SECONDS) {
  const maximum = Math.max(1, Math.min(MAX_EXPORT_SECONDS, Number(maxDurationSeconds) || MAX_SECONDS));
  const seconds = Number.isFinite(Number(durationSeconds)) ? Number(durationSeconds) : MAX_SECONDS;
  const frameCount = Math.max(1, Math.min(Math.round(maximum * FPS), Math.round(Math.max(0, seconds) * FPS)));
  return {frameRate: FPS, frameCount, durationSeconds: frameCount / FPS};
}

export async function getOfflineSceneExportSupport({canvas, videoBitsPerSecond = 6_000_000, environment = globalThis} = {}) {
  const width = Number(canvas?.width), height = Number(canvas?.height);
  if (!environment.VideoEncoder?.isConfigSupported || !environment.VideoFrame) {
    return {supported: false, reason: 'L’export image par image n’est pas disponible dans ce navigateur.'};
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width % 2 || height % 2) {
    return {supported: false, reason: 'La vidéo H.264 requiert une largeur et une hauteur paires.'};
  }
  // Prefer native hardware H.264. Software remains a valid offline fallback: no frames are dropped.
  for (const hardwareAcceleration of ['prefer-hardware', 'no-preference']) {
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.420028']) {
      const config = {codec, width, height, bitrate: bitRate(videoBitsPerSecond), bitrateMode: 'variable',
        framerate: FPS, latencyMode: 'quality', hardwareAcceleration, alpha: 'discard', avc: {format: 'avc'}};
      try {
        const result = await environment.VideoEncoder.isConfigSupported(config);
        if (result.supported) return {supported: true, config, width, height, frameRate: FPS, format: 'MP4', mimeType: 'video/mp4'};
      } catch { /* Probe the next supported H.264 configuration. */ }
    }
  }
  return {supported: false, reason: 'L’encodeur H.264 image par image est indisponible ; utiliser l’enregistrement natif.'};
}

/**
 * Return a silent MP4 Blob with exactly 30 frames per second, starting at t=0.
 * renderFrame(timeSeconds, frameIndex, {signal}) must await projection-video seeking,
 * update simulation with that time, then render the canvas before it resolves.
 * No requestAnimationFrame, playback, captureStream, live state or download is changed here.
 * `environment` is an optional test seam; application callers should omit it.
 */
export async function exportOfflineScene({
  canvas, renderFrame, durationSeconds = 30, onProgress, signal,
  videoBitsPerSecond = 6_000_000, maxDurationSeconds = MAX_SECONDS, environment = globalThis,
} = {}) {
  if (typeof renderFrame !== 'function') throw new TypeError('renderFrame est requis pour calculer la vidéo.');
  checkAbort(signal);
  const support = await abortable(getOfflineSceneExportSupport({canvas, videoBitsPerSecond, environment}), signal);
  if (!support.supported) throw unsupportedError(support.reason);
  const timing = offlineSceneTiming(durationSeconds, maxDurationSeconds);
  const maxBytes = Math.min(256 * 1024 * 1024, Math.max(64 * 1024 * 1024, timing.durationSeconds * bitRate(videoBitsPerSecond) / 8 * 1.4));
  const {width, height, config} = support;
  const target = new BufferTarget();
  const output = new Output({target, format: new Mp4OutputFormat({fastStart: 'in-memory'})});
  const source = new EncodedVideoPacketSource('avc');
  output.addVideoTrack(source, {frameRate: FPS});
  let encoder, encodedFrames = 0, renderedFrames = 0, encodedBytes = 0;
  let fatalError = null, decoderConfigSeen = false, success = false;
  let writes = Promise.resolve();
  const durations = new Map();
  const notify = phase => {
    try { onProgress?.({phase, frames: renderedFrames, encodedFrames, totalFrames: timing.frameCount,
      ratio: phase === 'complete' ? 1 : Math.min(.99, renderedFrames / timing.frameCount),
      timeSeconds: renderedFrames / FPS, durationSeconds: timing.durationSeconds, frameRate: FPS}); } catch { /* UI only. */ }
  };
  const check = () => { checkAbort(signal); if (fatalError) throw fatalError; };
  const clock = () => environment.performance?.now?.() ?? Date.now();
  const yieldTask = () => abortable(new Promise(resolve => environment.setTimeout(resolve, 0)), signal);
  const aborted = () => {
    try { if (encoder?.state !== 'closed') encoder?.close(); } catch { /* Already stopped. */ }
  };
  signal?.addEventListener('abort', aborted, {once: true});
  try {
    await output.start();
    check();
    encoder = new environment.VideoEncoder({
      output(chunk, metadata) {
        if (signal?.aborted || fatalError) return;
        try {
          if (metadata?.decoderConfig) {
            if (!metadata.decoderConfig.description?.byteLength) throw new Error('L’encodeur H.264 n’a pas fourni sa configuration AVC.');
            decoderConfigSeen = true;
          }
          if (!decoderConfigSeen) throw new Error('Configuration AVC absente du premier paquet vidéo.');
          const duration = durations.get(chunk.timestamp);
          if (duration === undefined) throw new Error('L’encodeur a renvoyé une image avec un temps inattendu.');
          durations.delete(chunk.timestamp);
          encodedBytes += chunk.byteLength;
          if (encodedBytes > maxBytes) throw new Error('La vidéo dépasse la taille prévue pour cet export.');
          const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
          // Encoder output is decode order; timestamps retain presentation order, including B-frames.
          const packet = new EncodedPacket(data, chunk.type, chunk.timestamp / 1e6, duration / 1e6);
          writes = writes.then(() => { check(); return source.add(packet, metadata); })
            .catch(error => { fatalError ||= error; });
          encodedFrames++;
        } catch (error) { fatalError ||= error; }
      },
      error(error) { fatalError ||= error; },
    });
    encoder.configure(config);
    notify('rendering');
    let lastYield = clock();
    for (let index = 0; index < timing.frameCount; index++) {
      check();
      if (encoder.encodeQueueSize >= MAX_QUEUE) {
        await abortable(encoder.flush(), signal);
        await abortable(writes, signal);
        check();
      }
      const timestamp = Math.round(index * 1e6 / FPS);
      const end = Math.round((index + 1) * 1e6 / FPS);
      await abortable(renderFrame(index / FPS, index, {signal}), signal);
      check();
      if (canvas.width !== width || canvas.height !== height) throw new Error('Les dimensions du rendu ont changé pendant l’export.');
      const frame = new environment.VideoFrame(canvas, {timestamp, duration: end - timestamp, alpha: 'discard'});
      try {
        durations.set(timestamp, end - timestamp);
        encoder.encode(frame, {keyFrame: index % (FPS * 2) === 0});
      } finally { frame.close(); }
      renderedFrames++;
      if (renderedFrames % 5 === 0 || renderedFrames === timing.frameCount) notify('rendering');
      if (clock() - lastYield >= 12 || index % 8 === 7) {
        await yieldTask(); lastYield = clock();
      }
    }
    notify('encoding');
    await abortable(encoder.flush(), signal);
    await abortable(writes, signal);
    check();
    if (encodedFrames !== timing.frameCount || durations.size) throw new Error('L’encodeur a perdu des images ; aucun fichier incomplet ne sera livré.');
    source.close();
    await abortable(output.finalize(), signal);
    check();
    if (!target.buffer?.byteLength) throw new Error('La création du fichier MP4 a échoué.');
    const blob = new (environment.Blob || Blob)([target.buffer], {type: 'video/mp4'});
    success = true;
    notify('complete');
    return blob;
  } finally {
    signal?.removeEventListener('abort', aborted);
    try { if (encoder?.state !== 'closed') encoder?.close(); } catch { /* Already closed after an error. */ }
    if (!success) { try { await output.cancel(); } catch { /* Preserve the render/encode/cancellation error. */ } }
    durations.clear();
  }
}
