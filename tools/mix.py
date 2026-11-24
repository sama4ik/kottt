# usage: python mix.py voice.mp3 audio/music.wav audio/sfx.wav  -> audio/mix.wav
# Locks music at exactly 50 % (-6.02 dB) of the voice's gated RMS and SFX at 50 % with peaks capped at 0.7x the
# voice peak. The voice is untouched. No ducking or compression: the only later processing is one linear gain + a
# peak limiter on the whole mix (finish step).
import sys, subprocess, numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 48000
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def gated_rms(x):
    b = int(0.4 * SR); n = len(x) // b
    p = (x[: n * b].reshape(n, b) ** 2).mean(1)
    p = p[p > 10 ** (-50 / 10)]                         # absolute gate -50 dBFS
    p = p[p > p.mean() * 10 ** (-20 / 10)]               # relative gate -20 dB
    return np.sqrt(p.mean())
db = lambda r: 20 * np.log10(r)

voice, music, sfx = (load(a) for a in sys.argv[1:4])
N = max(len(voice), len(music), len(sfx))
pad = lambda x: np.pad(x, (0, N - len(x)))
voice, music, sfx = pad(voice), pad(music), pad(sfx)
vr, vp = gated_rms(voice), np.abs(voice).max()
target = 0.5 * vr
for _ in range(8):   # iterate: the absolute gate makes gated RMS depend on the level itself
    music *= target / gated_rms(music)
    sfx *= target / gated_rms(sfx)
cap = 0.7 * vp
env = maximum_filter1d(np.abs(sfx), int(0.006 * SR))
g = np.minimum(1.0, cap / np.maximum(env, 1e-9))
g = np.minimum(g, uniform_filter1d(g, int(0.003 * SR)))
sfx *= g
sfx = np.clip(sfx, -cap, cap)
for _ in range(8):   # after the peak cap, only ever turn SFX down to stay at or below 50 %
    r = gated_rms(sfx)
    if r > target: sfx *= target / r
mix = voice + music + sfx
print(f"voice gated RMS {db(vr):.2f} dBFS, peak {db(vp):.2f} dBFS")
print(f"music vs voice: {db(gated_rms(music)) - db(vr):+.2f} dB (target -6.02)")
print(f"sfx   vs voice: {db(gated_rms(sfx)) - db(vr):+.2f} dB (target <= -6.02), sfx peak {db(np.abs(sfx).max()):.2f} dBFS vs cap {db(cap):.2f}")
print(f"mix peak {db(np.abs(mix).max()):.2f} dBFS, length {N / SR:.3f} s")
wavfile.write("audio/mix.wav", SR, mix.astype(np.float32))
for n, x in (("stem_music", music), ("stem_sfx", sfx)): wavfile.write(f"audio/{n}.wav", SR, x.astype(np.float32))
