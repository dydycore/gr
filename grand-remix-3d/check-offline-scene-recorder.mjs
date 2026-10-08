import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {exportOfflineScene, getOfflineSceneExportSupport, offlineSceneTiming} from './offline-scene-recorder.js';

// A real 32x32 H.264 magenta IDR/avcC fixture generated with FFmpeg.
// Encoding is mocked below; the actual Mediabunny muxer and final MP4 decoding are exercised.
const avcC = Uint8Array.from(Buffer.from('0142c00affe100156742c00ad9096c0440000003004000000f03c4899201000568cb83cb20', 'hex'));
const idr = Uint8Array.from(Buffer.from('0000001665888409f118a000216f1c00046da3800091b49d75e0', 'hex'));
function harness({unsupported = false, missingConfig = false, drop = false, encodeError = false, softwareOnly = false} = {}) {
  const configs = [], frames = [], instances = [], rendered = [], progress = [], keyFrames = [];
  let maxQueue = 0;
  const canvas = {width: 32, height: 32, rendered: -1};
  class VideoFrame {
    constructor(source, options) { Object.assign(this, options); this.snapshot = source.rendered; this.closed = false; frames.push(this); }
    close() { assert.equal(this.closed, false); this.closed = true; }
  }
  class VideoEncoder {
    static async isConfigSupported(config) { configs.push(config); return {supported: !unsupported && (!softwareOnly || config.hardwareAcceleration === 'no-preference'), config}; }
    constructor(callbacks) { this.callbacks = callbacks; this.state = 'unconfigured'; this.queue = []; this.encodeQueueSize = 0; this.outputs = 0; this.closed = false; instances.push(this); }
    configure(config) { this.config = config; this.state = 'configured'; }
    encode(frame, options) {
      if (encodeError && frames.length === 5) { this.callbacks.error(new Error('Hardware failed')); return; }
      assert.equal(frame.closed, false); assert.equal(frame.snapshot, frames.length - 1, 'Canvas was rendered before snapshot');
      this.queue.push({timestamp: frame.timestamp, duration: frame.duration});
      keyFrames.push(options.keyFrame); this.encodeQueueSize++;
      maxQueue = Math.max(maxQueue, this.encodeQueueSize);
    }
    async flush() {
      await new Promise(resolve => setImmediate(resolve));
      if (this.closed) throw new Error('Closed encoder');
      for (const frame of this.queue.splice(0)) {
        if (drop && this.outputs === 2) { this.outputs++; continue; }
        const first = this.outputs++ === 0;
        this.callbacks.output({type: 'key', byteLength: idr.length, timestamp: frame.timestamp, duration: frame.duration,
          copyTo(target) { target.set(idr); }},
          first && !missingConfig ? {decoderConfig: {codec: 'avc1.42c00a', codedWidth: 32, codedHeight: 32, description: avcC}} : undefined);
      }
      this.encodeQueueSize = 0;
    }
    close() { this.closed = true; this.state = 'closed'; this.queue.length = 0; this.encodeQueueSize = 0; }
  }
  const environment = {VideoEncoder, VideoFrame, Blob, setTimeout, performance};
  async function renderFrame(time, index) { await Promise.resolve(); canvas.rendered = index; rendered.push({time, index}); }
  return {canvas, environment, renderFrame, progress, configs, frames, instances, rendered, keyFrames,
    onProgress: p => progress.push(p), maxQueue: () => maxQueue};
}

assert.deepEqual(offlineSceneTiming(100), {frameRate: 30, frameCount: 900, durationSeconds: 30});
assert.equal(offlineSceneTiming(2).frameCount, 60);
assert.equal(offlineSceneTiming(0).frameCount, 1);
assert.equal(offlineSceneTiming(NaN).frameCount, 900);
const h = harness();
const blob = await exportOfflineScene({...h, durationSeconds: 30});
assert.equal(blob.type, 'video/mp4');
assert.equal(h.rendered.length, 900); assert.equal(h.frames.length, 900);
assert.equal(h.rendered[0].time, 0); assert.equal(h.rendered[899].time, 899 / 30);
assert.equal(h.frames[0].timestamp, 0);
assert.equal(h.frames.at(-1).timestamp + h.frames.at(-1).duration, 30_000_000);
assert.equal(h.frames.reduce((sum, frame) => sum + frame.duration, 0), 30_000_000);
assert.ok(h.frames.every(frame => frame.closed));
assert.ok(h.maxQueue() <= 4, 'Encoded queue bounded to four frames');
assert.equal(h.instances[0].config.avc.format, 'avc');
assert.equal(h.instances[0].config.framerate, 30); assert.equal(h.instances[0].config.latencyMode, 'quality');
assert.equal(h.instances[0].config.hardwareAcceleration, 'prefer-hardware');
assert.equal(h.instances[0].closed, true);
assert.equal(h.keyFrames.filter(Boolean).length, 15);
assert.equal(h.progress.at(-1).phase, 'complete'); assert.equal(h.progress.at(-1).encodedFrames, 900);
assert.ok(h.progress.slice(0, -1).every(p => p.ratio < 1));
const buffer = Buffer.from(await blob.arrayBuffer());
assert.equal(buffer.toString('ascii', 4, 8), 'ftyp');
assert.ok(buffer.indexOf(Buffer.from('moov')) < buffer.indexOf(Buffer.from('mdat')), 'Fast-start MP4 puts metadata before media');
const probe = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration:format=duration', '-of', 'json', 'pipe:0'], {input: buffer});
if (!probe.error) {
  assert.equal(probe.status, 0, probe.stderr.toString());
  const metadata = JSON.parse(probe.stdout.toString());
  assert.equal(metadata.streams.length, 1); assert.equal(metadata.streams[0].width, 32); assert.equal(metadata.streams[0].height, 32);
  assert.equal(metadata.streams[0].codec_name, 'h264'); assert.equal(metadata.streams[0].nb_read_frames, '900');
  assert.equal(metadata.streams[0].r_frame_rate, '30/1'); assert.equal(Number(metadata.format.duration), 30);
  console.log('Real MP4 mux/decode: H264, 900 frames, 30 fps, exactly 30.000s, no audio.');
} else console.log('FFprobe unavailable: container structure checked; actual decode skipped.');

{
  const x = harness({softwareOnly: true});
  const support = await getOfflineSceneExportSupport(x);
  assert.equal(support.supported, true); assert.equal(support.config.hardwareAcceleration, 'no-preference');
}
{
  const x = harness({unsupported: true});
  await assert.rejects(exportOfflineScene(x), error => error.code === 'OFFLINE_EXPORT_UNSUPPORTED');
  assert.equal(x.rendered.length, 0);
  assert.equal((await getOfflineSceneExportSupport({canvas: {width: 33, height: 32}, environment: h.environment})).supported, false);
  assert.equal((await getOfflineSceneExportSupport({canvas: h.canvas, environment: {}})).supported, false);
}
for (const options of [{missingConfig: true}, {drop: true}, {encodeError: true}]) {
  const x = harness(options); await assert.rejects(exportOfflineScene({...x, durationSeconds: .2}));
  assert.equal(x.instances[0].closed, true); assert.ok(x.frames.every(frame => frame.closed));
  assert.ok(x.progress.every(p => p.phase !== 'complete'));
}
{
  const x = harness(), controller = new AbortController(); controller.abort();
  await assert.rejects(exportOfflineScene({...x, signal: controller.signal}), {name: 'AbortError'});
  assert.equal(x.instances.length, 0); assert.equal(x.rendered.length, 0);
}
{
  const x = harness(), controller = new AbortController();
  const renderFrame = async (time, index) => { await x.renderFrame(time, index); if (index === 5) controller.abort(); };
  await assert.rejects(exportOfflineScene({...x, renderFrame, signal: controller.signal}), {name: 'AbortError'});
  assert.equal(x.instances[0].closed, true); assert.equal(x.frames.length, 5); assert.ok(x.frames.every(frame => frame.closed));
}
{
  const x = harness(), controller = new AbortController();
  const task = exportOfflineScene({...x, signal: controller.signal, renderFrame: () => new Promise(() => {})});
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(task, {name: 'AbortError'});
  assert.equal(x.instances[0].closed, true);
}
{
  const x = harness();
  await assert.rejects(exportOfflineScene({...x, renderFrame: () => { throw new Error('Projection failed'); }}), /Projection failed/);
  assert.equal(x.instances[0].closed, true);
}
{
  const x = harness();
  await assert.rejects(exportOfflineScene({...x, renderFrame: () => { x.canvas.width = 64; }}), /dimensions/);
  assert.equal(x.instances[0].closed, true);
}
console.log('PASS offline export: exact timeline from zero, AVC config/metadata, 900 complete frames, backpressure, async render, cancellation, fallback detection and cleanup. Actual browser/GPU encoding remains integration QA.');
