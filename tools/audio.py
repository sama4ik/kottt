# Ice King sound: synthesized music bed + SFX stems (48 kHz mono float). Levels are set later by mix.py.
# Picture timing is locked: every cue below is a frame from src/iceking/story.ts divided by 30.
import numpy as np, sys, os
os.makedirs("audio", exist_ok=True)
from scipy.io import wavfile

SR = 48000
DUR = 1114 / 30
N = int(round(DUR * SR))
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(d * SR)) / SR

def put(buf, t0, x, g=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += g * x

def bp(x, lo, hi):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    m = ((fr >= lo) & (fr <= hi)).astype(float)
    # soft edges
    m = np.convolve(m, np.hanning(31) / np.hanning(31).sum(), mode="same")
    return np.fft.irfft(X * m, len(x))

def env(n, a=0.005, r=0.1):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
    return e

def fade(x, a=0.01, b=0.05):
    n = len(x); ia, ib = int(a * SR), int(b * SR)
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x

def note(f, d, harm=(1, .5, .3, .2), decay=0.6, att=0.004, vib=0.0):
    t = T(d)
    ph = 2 * np.pi * f * t + (vib * np.sin(2 * np.pi * 5.5 * t) if vib else 0)
    y = sum(a * np.sin((k + 1) * ph) for k, a in enumerate(harm))
    return fade(y * env(len(t), att, decay), 0.002, 0.03)

def midi(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------- music ----------------
BPM = 104; BEAT = 60 / BPM; BAR = 4 * BEAT
music = np.zeros(N)
def sec_gain(t):
    # section map (s): hook / Boston / sea / market (decline) / bar (night) / India / stop
    if t < 4.4: return dict(drum=0, bass=.5, pad=.35, mel=.9, minor=False)
    if t < 13.93: return dict(drum=.7, bass=.9, pad=.6, mel=.8, minor=False)
    if t < 18.18: return dict(drum=1, bass=1, pad=.8, mel=1, minor=False)
    if t < 22.9: return dict(drum=0, bass=.6, pad=.5, mel=.6, minor=True)
    if t < 31.0: return dict(drum=.6, bass=.9, pad=.45, mel=.8, minor=False)
    if t < 34.53: return dict(drum=1, bass=1, pad=.9, mel=1, minor=False)
    return None
MAJ = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]   # C F G C
MIN = [[57, 60, 64], [53, 57, 60], [57, 60, 64], [52, 56, 59]]   # Am F Am E
MEL_MAJ = [[72, 74, 76, 79], [77, 76, 74, 72], [74, 76, 79, 76], [72, 67, 72, None]]
MEL_MIN = [[69, None, 67, None], [65, None, 64, None], [69, None, 72, None], [68, None, 64, None]]
kick = lambda: fade(np.sin(2 * np.pi * np.cumsum(np.linspace(110, 42, int(.28 * SR))) / SR) * env(int(.28 * SR), .002, .09), 0, .02)
def snare():
    n = int(.16 * SR); return bp(rng.normal(0, 1, n), 900, 7000) * env(n, .001, .045) * .6 + np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env(n, .001, .03) * .4
def hat():
    n = int(.05 * SR); return bp(rng.normal(0, 1, n), 6000, 15000) * env(n, .001, .012) * .5
def accordion(freqs, d):
    t = T(d); y = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0.004):
            ph = 2 * np.pi * f * (1 + det) * t
            y += sum((1 / k) * np.sin(k * ph) * (0.85 ** k) for k in range(1, 9))
    trem = 1 + .18 * np.sin(2 * np.pi * 5 * t)
    a = np.minimum(1, t / .06); r = np.minimum(1, (d - t) / .08)
    return y * trem * a * r / len(freqs) * .5
t = 0.0; bar_i = 0
while t < 34.53:
    g = sec_gain(t)
    prog = MIN if g["minor"] else MAJ; mel = MEL_MIN if g["minor"] else MEL_MAJ
    ch = prog[bar_i % 4]
    put(music, t, accordion([midi(m) for m in ch], BAR * .98), g["pad"])
    for b in range(4):
        tb = t + b * BEAT
        if tb >= 34.53: break
        gb = sec_gain(tb)
        if gb is None: break
        root = ch[0] - 24
        put(music, tb, note(midi(root if b % 2 == 0 else root + 7), BEAT * .9, (1, .6, .25), .25), .55 * gb["bass"])  # oom-pah bass
        if gb["drum"]:
            if b % 2 == 0: put(music, tb, kick(), .9 * gb["drum"])
            else: put(music, tb, snare(), .45 * gb["drum"])
            put(music, tb + BEAT / 2, hat(), .35 * gb["drum"])
        m = mel[bar_i % 4][b]
        if m is not None:  # marimba / glock melody
            put(music, tb, note(midi(m), BEAT * .95, (1, 0, 0, .35, 0, .12), .28), .32 * gb["mel"])
    t += BAR; bar_i += 1
# stop at the twist (34.53 s): short tail, then a low drone to the end
cut = int(34.53 * SR); tail = int(.25 * SR)
music[cut:cut + tail] *= np.linspace(1, 0, tail); music[cut + tail:] = 0
dr_t = T(DUR - 34.6)
drone = (np.sin(2 * np.pi * 65.4 * dr_t) + .5 * np.sin(2 * np.pi * 98.0 * dr_t) + .25 * np.sin(2 * np.pi * 130.8 * dr_t)) * np.minimum(1, dr_t / .5) * .35
put(music, 34.6, fade(drone, .01, .3))
# sting chord when the crown lands (36.33 s)
for m in (72, 76, 79, 84):
    put(music, 36.33, note(midi(m), DUR - 36.33, (1, 0, .3, 0, .1), 1.2), .25)

# ---------------- SFX ----------------
sfx = np.zeros(N)
def noise(d): return rng.normal(0, 1, int(d * SR))
def ting(f0=2400, d=1.0, dec=.35):
    t = T(d); return sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / (dec / (r ** .5))) for r, a in ((1, 1), (2.76, .5), (5.4, .25)))
def whoosh(d=.45, lo=300, hi=3000):
    x = bp(noise(d), lo, hi); t = T(d); e = np.sin(np.pi * np.minimum(1, t / d)) ** 2
    return x * e * .5
def thunk(f=85, d=.25):
    t = T(d); return np.sin(2 * np.pi * f * t * (1 - .3 * t)) * np.exp(-t / .07) + bp(noise(d), 200, 2000) * np.exp(-t / .012) * .4
def ambience(d, lo, hi, am=.12, depth=.4):
    t = T(d); return bp(noise(d), lo, hi) * (1 - depth + depth * np.sin(2 * np.pi * am * t) ** 2)
def quack(d=.2):
    t = T(d); f = np.linspace(520, 380, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(k * ph) * np.exp(-((k * 450 - 1100) / 700) ** 2) for k in range(1, 12))
    return fade(y * np.minimum(1, t / .01) * np.exp(-t / .12), .002, .03) * .5
def sad_trombone():
    out = np.zeros(int(1.5 * SR))
    for i, (m, d) in enumerate(((58, .32), (57, .32), (56, .32), (55, .6))):
        t = T(d); ph = 2 * np.pi * midi(m) * t + (.6 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0)
        y = sum((.8 ** k) * np.sin(k * ph) for k in range(1, 10)) * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .06)
        put(out, i * .32, y * .25)
    return out
def drip():
    t = T(.06); f = np.linspace(900, 1900, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .018)
def crickets(d):
    out = np.zeros(int(d * SR)); t0 = 0.0
    while t0 < d - .2:
        for k in range(3): put(out, t0 + k * .03, np.sin(2 * np.pi * 4600 * T(.018)) * np.hanning(int(.018 * SR)))
        t0 += .55 + .3 * rng.random()
    return out
def coins(d=.35):
    out = np.zeros(int(d * SR) + SR)
    for k in range(6): put(out, rng.random() * d, ting(3000 + 1800 * rng.random(), .5, .08), .35)
    return out
def flap(d=.45):
    t = T(d); return bp(noise(d), 400, 4000) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 14 * t))) * np.sin(np.pi * t / d) * .6
def bell(f0=520, d=2.5):
    t = T(d); return sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / (1.4 / r)) for r, a in ((1, 1), (2.0, .6), (2.4, .4), (3.0, .3), (4.2, .2)))
def gull(d=.5):
    t = T(d); f = 1600 - 700 * (t / d) + 60 * np.sin(2 * np.pi * 18 * t); y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return y * np.sin(np.pi * t / d) * .3
def cheer(d):
    t = T(d); x = sum(bp(noise(d), lo, lo * 2.2) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.7 + k * .37) * t + k)) for k, lo in enumerate((350, 700, 1400)))
    return x * np.minimum(1, t / .4) * np.minimum(1, (d - t) / .3) * .5
def boom(d=1.2):
    t = T(d); return np.sin(2 * np.pi * 48 * t) * np.exp(-t / .35) + bp(noise(d), 40, 300) * np.exp(-t / .15) * .6

AMB = .05  # ambience beds sit far under the hits
put(sfx, 0.0, fade(ambience(4.4, 150, 1200, .15, .6), .3, .2), AMB * 1.4)          # surf on the beach
put(sfx, 2.13, ting(2600, 1.2, .4), .5)                                              # ice sparkle (f64)
put(sfx, 4.15, whoosh(.5, 400, 5000), .7)                                            # into the flash (f128-133)
put(sfx, 4.4, fade(ambience(9.5, 250, 2500, .09, .7), .2, .3), AMB)                  # Boston winter wind
put(sfx, 6.93, thunk(140, .18), .45)                                                 # arms crossed "nope" (f208)
put(sfx, 7.07, thunk(120, .18), .35)
put(sfx, 9.8, thunk(75, .3), .8); put(sfx, 9.82, coins(), .9)                       # bag lands (f294)
put(sfx, 10.38, flap(.55), .5); put(sfx, 10.4, whoosh(.6, 200, 2500), .4)            # sails drop (f312-326)
put(sfx, 11.75, bp(noise(.5), 2500, 9000) * np.hanning(int(.5 * SR)) * .5, .5)      # paper rustle
for k in range(4): put(sfx, 12.2 + k * .23, note(midi(76 - k * 2), .18, (1, .3), .08), .25)  # laugh beats (f366+)
put(sfx, 13.83, whoosh(.45), .55)                                                    # cut to the sea
put(sfx, 13.93, fade(ambience(4.25, 120, 900, .2, .6), .1, .2), AMB * 1.6)           # open sea
for t0 in (14.6, 16.1): put(sfx, t0, gull(.45), .5)
put(sfx, 16.4, ting(3000, 1.0, .3), .45); put(sfx, 16.6, quack(), .7)                # frozen duck (f492)
put(sfx, 19.07, sad_trombone(), .55)                                                 # nobody wanted it (f572)
for k in range(5): put(sfx, 18.6 + k * .87, drip(), .35)                             # melting drips
put(sfx, 21.33, bp(noise(.35), 600, 3000) * np.linspace(0.2, 1, int(.35 * SR)) * np.hanning(int(.35 * SR)), .35)  # sip (f640)
put(sfx, 22.9, crickets(8.1), .12)                                                   # night
put(sfx, 22.85, whoosh(.35, 300, 3000), .4)
put(sfx, 24.13, ting(3400, 1.0, .25), .6); put(sfx, 24.16, ting(4300, .6, .12), .35) # ice into the glass (f724)
put(sfx, 25.67, ting(2200, 1.4, .5), .4); put(sfx, 25.75, ting(3300, 1.2, .4), .3)   # habit sparkle (f770)
put(sfx, 28.0, bp(noise(.5), 1200, 4000) * np.hanning(int(.5 * SR)) * .7, .4)       # block slides (f840)
put(sfx, 28.5, thunk(110, .22), .6)                                                  # lands at the bartender (f855)
for k in range(5): put(sfx, 29.73 + k * .07, ting(3600 + 300 * k, .5, .1), .35)     # glasses clink (f893+)
put(sfx, 30.8, whoosh(.5, 400, 5000), .7)                                            # flash to India (f930)
put(sfx, 31.0, fade(ambience(3.53, 150, 1500, .1, .5), .2, .2), AMB * 1.2)          # harbour
for t0 in (31.4, 32.3): put(sfx, t0, gull(.5), .5)
put(sfx, 33.27, bell(), .45)                                                         # harbour bell (f998)
put(sfx, 34.45, cheer(DUR - 34.45), .35)                                             # crowd cheers
put(sfx, 36.33, boom(), .9); put(sfx, 36.33, ting(2800, 1.0, .5), .5)               # crown lands (f1090)

for name, x in (("music", music), ("sfx", sfx)):
    x = x.astype(np.float32)
    wavfile.write(f"audio/{name}.wav", SR, x)
    print(name, "peak %.3f rms %.4f" % (np.abs(x).max(), np.sqrt((x ** 2).mean())))
