"""Prepare licensed filmed footage as small, silent, graded web loops."""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, subprocess

ROOT = Path(__file__).resolve().parent / 'media' / 'backgrounds'
CONFIG = {
    'hiphop': (.90, 'eq=saturation=0.50:contrast=1.10:brightness=0.03:gamma=1.45', 1.25),
    'dream': (.65, 'eq=saturation=1.15:contrast=1.07:brightness=-0.055,colorbalance=rs=-0.025:bs=0.06', 2),
    'warm': (.65, 'colorchannelmixer=rr=0.7:rg=0.38:rb=0.1:gr=0.25:gg=0.65:gb=0.04:br=0.04:bg=0.18:bb=0.14,eq=saturation=1.22:contrast=1.06:brightness=0.015', 2),
    'pinky': (.65, 'hue=h=-18:s=0.9,colorbalance=bm=0.09:bh=0.06,eq=contrast=1.04:brightness=-0.015', 2),
    'red_alert': (1.15, 'colorchannelmixer=rr=1:rg=0.15:rb=0:gr=0:gg=0.25:gb=0:br=0:bg=0:bb=0.1,eq=saturation=1.3:contrast=1.14', 1),
}

def probe(file):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(file)]))

def encode(name):
    source, dest = ROOT / (name + '-source.mp4'), ROOT / (name + '.mp4')
    speed, grade, fade = CONFIG[name]
    duration = min(24, float(probe(source)['format']['duration']) / speed)
    duration = int(duration * 24) / 24
    # Include the fully dissolved endpoint frame. Without this guard, xfade's
    # final sample retains 1/(fade*fps) of the tail and can visibly jump at wrap.
    # Leave the existing red recipe unchanged; only the three gentle loops change.
    head_frames = int(fade * 24) + (0 if name == 'red_alert' else 1)
    head_seconds = head_frames / 24
    assert duration > fade * 2
    graph = (
        f"[0:v]crop=min(iw\\,ih):min(iw\\,ih),scale=1024:1024:flags=lanczos,"
        f"setpts=(PTS-STARTPTS)/{speed},fps=24,trim=duration={duration},{grade},"
        f"format=yuv420p,split=2[a][b];"
        f"[a]trim=start_frame={head_frames},setpts=PTS-STARTPTS[body];"
        f"[b]trim=end_frame={head_frames},setpts=PTS-STARTPTS[head];"
        f"[body][head]xfade=transition=fade:duration={fade}:offset={duration-head_seconds-fade},format=yuv420p[v]"
    )
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-threads', '2', '-i', str(source),
        '-filter_complex_threads', '2', '-filter_complex', graph, '-map', '[v]', '-an',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-threads', '2', '-maxrate', '3M',
        '-bufsize', '6M', '-movflags', '+faststart', '-y', str(dest)], check=True)
    metadata = probe(dest)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(dest), '-f', 'null', '-'], check=True)
    video = next(s for s in metadata['streams'] if s['codec_type'] == 'video')
    assert video['width'] == video['height'] == 1024
    assert video['avg_frame_rate'] == '24/1'
    assert float(metadata['format']['duration']) <= 30
    assert all(s['codec_type'] != 'audio' for s in metadata['streams'])
    result = {'file': dest.name, 'source': source.name, 'speed': speed, 'duration': metadata['format']['duration'],
        'frames': video['nb_frames'], 'dimensions': [1024, 1024], 'fps': 24, 'bytes': dest.stat().st_size,
        'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'full_decode': 'pass',
        'crossfade_seconds': fade, 'head_frames': head_frames,
        'loop': f'{fade}-second wrap dissolve; adjacent source frames at boundary, endpoint guard on gentle loops'}
    print(name, result['duration'], 's', result['bytes'], 'bytes', flush=True)
    return name, result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('clips', nargs='*', choices=list(CONFIG))
    names = parser.parse_args().clips or list(CONFIG)
    verification = ROOT / 'encoding-verification.json'
    results = json.loads(verification.read_text(encoding='utf-8')) if verification.exists() else {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results.update(dict(pool.map(encode, names)))
    verification.write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
