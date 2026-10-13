import assert from 'node:assert/strict';
import {createSceneRecorder, getSceneRecordingSupport, sceneRecordingFilename} from './video-recorder.js';

const mp4Header = Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0]);
const webmHeader = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
function harness({formats = ['video/mp4;codecs=avc1'], failConstruct = false, startError = false, noData = false, noStopEvent = false, actualFormat, badData = false, captureError} = {}) {
  let time = 0, nextTimer = 1, nextUrl = 1;
  const timers = new Map(), urls = new Map(), revoked = [], recordings = [], captures = [], clicks = [];
  const states = [], errors = [], completed = [];
  const events = object => Object.assign(object, {
    handlers: new Map(), addEventListener(type, callback) { this.handlers.set(type, callback); },
    removeEventListener(type, callback) { if (this.handlers.get(type) === callback) this.handlers.delete(type); },
    fire(type) { this.handlers.get(type)?.(); },
  });
  const document = events({hidden: false, body: {appendChild() {}},
    createElement(tag) { assert.equal(tag, 'a'); return {style: {}, click() { clicks.push({filename: this.download, url: this.href}); }, remove() {}}; },
  });
  const canvas = events({width: 1280, height: 720, captureStream(frameRate) {
    if (captureError) throw captureError;
    const track = events({kind: 'video', stopped: 0, stop() { this.stopped++; }});
    const stream = {getTracks: () => [track], getVideoTracks: () => [track]};
    captures.push({track, stream, frameRate}); return stream;
  }});
  class MediaRecorder {
    static isTypeSupported(type) { return formats.includes(type); }
    constructor(stream, options) {
      if (failConstruct && options.mimeType.startsWith('video/mp4')) throw new Error('MP4 encoder busy');
      this.stream = stream; this.options = options; this.mimeType = options.mimeType; this.state = 'inactive'; recordings.push(this);
    }
    start(slice) {
      if (startError) throw new Error('Encoder unavailable');
      this.slice = slice; this.state = 'recording';
    }
    chunk(value) { this.ondataavailable?.({data: new Blob([value], {type: this.mimeType})}); }
    stop() {
      this.state = 'inactive';
      if (noStopEvent) return;
      queueMicrotask(() => {
        if (!noData) this.chunk(badData ? 'invalid video bytes' : (actualFormat || this.mimeType).includes('webm') ? webmHeader : mp4Header);
        this.onstop?.();
      });
    }
    error() { this.onerror?.({error: new Error('Encoding failed')}); }
  }
  const environment = {MediaRecorder, Blob, document, performance: {now: () => time},
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, {at: time + delay, callback}); return id; },
    clearTimeout(id) { timers.delete(id); },
    URL: {createObjectURL(blob) { const url = `blob:test-${nextUrl++}`; urls.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); urls.delete(url); }},
  };
  const api = createSceneRecorder({canvas, environment, onState: s => states.push(s), onError: e => errors.push(e), onComplete: r => completed.push(r)});
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, task] = next; timers.delete(id); time = task.at; task.callback();
    }
    time = end;
  }
  return {api, environment, canvas, document, recordings, captures, states, errors, completed, timers, clicks, urls, revoked, advance};
}

// No permission/device enumeration API exists in the fixture. A run can only capture the provided canvas.
{
  const h = harness();
  assert.equal(h.api.getSupport().format, 'MP4');
  assert.equal(h.api.start({name: 'Pinky love / été'}), true);
  assert.equal(h.api.start(), false, 'Do not overlap sessions');
  assert.equal(h.captures.length, 1); assert.equal(h.captures[0].frameRate, 30);
  assert.equal(h.recordings[0].stream, h.captures[0].stream);
  assert.equal(h.recordings[0].options.videoBitsPerSecond, 4_000_000);
  h.advance(2500);
  const result = await h.api.stop();
  assert.equal(result.format, 'MP4'); assert.equal(result.mimeType, 'video/mp4'); assert.equal(result.durationSeconds, 2.5);
  assert.match(result.filename, /^grand-remix-pinky-love-ete-.*\.mp4$/);
  assert.equal(result.width, 1280); assert.equal(result.height, 720);
  assert.equal(h.completed.length, 1); assert.equal(h.clicks.length, 0, 'No unsolicited download');
  assert.equal(h.captures[0].track.stopped, 1); assert.equal(h.timers.size, 0);
  assert.equal(h.document.handlers.size, 0); assert.equal(h.canvas.handlers.size, 0);
  assert.equal(h.api.download(), true); assert.equal(h.clicks[0].filename, result.filename);
  assert.equal(h.api.start({name: 'Nouvelle ambiance', durationSeconds: 1, autoDownload: true}), true);
  assert.ok(h.revoked.includes(result.url));
  h.advance(1000); await flush();
  assert.equal(h.completed.length, 2); assert.equal(h.clicks.length, 2);
  h.api.dispose(); assert.equal(h.urls.size, 0); assert.equal(h.api.download(), false); assert.equal(h.api.start(), false);
}
{
  const h = harness(); h.api.start({durationSeconds: 200});
  assert.equal(h.api.getState().durationSeconds, 30);
  h.advance(29_999); assert.equal(h.api.getState().status, 'recording');
  h.advance(1); await flush();
  assert.equal(h.completed.length, 1); assert.equal(h.completed[0].durationSeconds, 30); assert.equal(h.timers.size, 0);
}
for (const options of [
  {formats: ['video/webm;codecs=vp8']},
  {formats: ['video/mp4;codecs=avc1', 'video/webm;codecs=vp8'], failConstruct: true},
  {actualFormat: 'video/webm'},
]) {
  const h = harness(options); assert.equal(h.api.start(), true);
  h.advance(1000); const result = await h.api.stop();
  assert.equal(result.format, 'WebM'); assert.equal(result.mimeType, 'video/webm'); assert.match(result.filename, /\.webm$/);
  assert.match(h.api.getState().message, /MP4 non disponible/);
  h.api.dispose();
}
for (const options of [{formats: []}, {startError: true}, {captureError: new DOMException('Tainted canvas', 'SecurityError')}]) {
  const h = harness(options); assert.equal(h.api.start(), false); assert.equal(h.errors.length, 1);
  assert.equal(h.api.getState().status, 'error'); assert.equal(h.timers.size, 0); assert.equal(h.completed.length, 0);
  if (h.captures.length) assert.equal(h.captures[0].track.stopped, 1);
  h.api.dispose();
}
for (const options of [{noData: true}, {badData: true}]) {
  const h = harness(options); h.api.start(); assert.equal(await h.api.stop(), null);
  assert.equal(h.errors.length, 1); assert.equal(h.completed.length, 0); assert.equal(h.timers.size, 0); assert.equal(h.urls.size, 0);
}
{
  const h = harness(); h.api.start(); h.recordings[0].error(); await flush();
  assert.equal(h.errors.length, 1); assert.equal(h.completed.length, 0); assert.equal(h.timers.size, 0);
  assert.equal(h.captures[0].track.stopped, 1); assert.equal(h.api.getState().status, 'error');
}
{
  const h = harness({noStopEvent: true}); h.api.start(); const done = h.api.stop(); h.advance(8000);
  assert.equal(await done, null); assert.equal(h.errors.length, 1); assert.equal(h.timers.size, 0);
}
{
  const h = harness(); h.api.start(); const done = h.api.stop(); h.api.dispose(); await flush();
  assert.equal(await done, null); assert.equal(h.completed.length, 0); assert.equal(h.clicks.length, 0);
  assert.equal(h.api.getState().status, 'disposed'); assert.equal(h.timers.size, 0); assert.equal(h.urls.size, 0);
}
{
  const h = harness(); h.api.start(); h.advance(1500); h.document.hidden = true; h.document.fire('visibilitychange'); await flush();
  assert.equal(h.completed[0].durationSeconds, 1.5); assert.equal(h.api.getState().status, 'ready');
  h.api.dispose();
}
{
  const h = harness(); h.api.start(); h.canvas.fire('webglcontextlost'); await flush();
  assert.equal(h.api.getState().status, 'error'); assert.equal(h.completed.length, 0); assert.equal(h.timers.size, 0);
}
assert.equal(getSceneRecordingSupport(null).supported, false);
assert.match(sceneRecordingFilename('../../Été 💗', 'mp4', new Date('2026-10-07T16:00:00Z')), /^grand-remix-ete-2026-10-07-16-00-00\.mp4$/);
console.log('PASS scene recorder: native MP4 / honest WebM fallback, actual container, 30s cap, download, failures, lifecycle and cleanup. Browser encoding/playback requires integration QA.');
