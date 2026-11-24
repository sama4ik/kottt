# The Ice Man Everyone Laughed At: cartoon short

A 37-second vertical (1080×1920, 30 fps) animated short about Frederic Tudor, the Boston "Ice King" who shipped pond ice to the tropics. Flat 2D bean-head characters live in a colourful 3D world with ink outlines, depth of field and gliding cameras. Everything is rendered with three.js inside Remotion, with no AI video generator.

▶ Final video: [`out/The-Ice-Man-Everyone-Laughed-At.mp4`](out/The-Ice-Man-Everyone-Laughed-At.mp4)
Stills: [`preview/sheet_preview.jpg`](preview/sheet_preview.jpg) · QA sheet: [`preview/qa_sheet.jpg`](preview/qa_sheet.jpg)

## Script (102 words)
> In eighteen-oh-six, a man tried to sell ice to a tropical island. Frederic Tudor lived in snowy Boston, and nobody would ship his crazy cargo. So he bought his own ship. The newspapers laughed at him. He sailed south with one hundred thirty tons of frozen pond. But when it arrived, nobody wanted it. They'd never needed cold drinks. You see, he wasn't selling ice. He was selling a habit. So he gave it to bartenders for free, until everyone was hooked. Years later, his ice sailed all the way to India. The man they laughed at became the Ice King.

Fact sources: [Wikipedia](https://en.wikipedia.org/wiki/Frederic_Tudor), [National Geographic](https://www.nationalgeographic.com/culture/article/frederic-tudor-king-ice), [Smithsonian](https://www.smithsonianmag.com/arts-culture/the-ice-king-cometh-frederic-tudor-father-of-the-ice-industry-29955743/).

## What's in here
| Path | What it is |
|---|---|
| `src/iceking/IceKing.tsx` | Remotion composition: own `<canvas>` + `WebGLRenderer`, renders one frame per Remotion frame |
| `src/iceking/engine.ts` | Renderer + post chain (RenderPass → ink → lens blur → bloom + Neutral tone map + grade), sky, light rig, 2D character cards |
| `src/iceking/sets.ts` | The world: tropical island, beach bar, snowy Boston harbour, open sea ship, Indian harbour with palace |
| `src/iceking/cast.ts` | Outfits, 2D props (ice block, newspaper, glass, cup, crown), blinks, idle motion, effect cards |
| `src/iceking/story.ts` | 10 shots: camera keys, light per shot, depth of field, world animation, the cast per frame |
| `src/iceking/{toon,paint,shade,lights,ink,lensblur,grade,cardshade}.ts` | Look modules from [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (MIT, see `LICENSE-claude-animated-shorts`), with small changes: a night light preset, custom arm poses and a prop hook in `toon.ts` |
| `PLAN.md` | Shot plan, with every visual timed to the narration's words |
| `voice/voice.mp3` + `voice.words.csv` | Narration (ElevenLabs `eleven_v4`, library voice "Keanu") and word timestamps (whisper.cpp) |
| `tools/` | `stills.mjs` (test stills), `sheet.py` (contact sheet), `render.mjs` (full render), `audio.py` (synthesized music + SFX), `mix.py` (level lock), `finish.sh` (loudness, mux, QA) |

## Build
Requires Node 22+, Python 3 with numpy, scipy and Pillow, and ffmpeg on PATH.
```bash
npm install
node tools/stills.mjs stills "20,300,525,1105" 0.5   # test stills (GPU via ANGLE; GL=swangle for CPU)
node tools/render.mjs                                  # -> out/video_noaudio.mp4 (~6 min on a GPU)
python tools/audio.py                                  # -> audio/music.wav, audio/sfx.wav
python tools/mix.py voice/voice.mp3 audio/music.wav audio/sfx.wav   # music at -6 dB vs voice (gated RMS), SFX <= -6 dB
bash tools/finish.sh "The Ice Man Everyone Laughed At"             # -14 LUFS gain + limiter, mux, QA
```

## Sound
Music and SFX are synthesized in numpy (accordion + oom-pah bass march, glock melody, sad trombone, frozen-duck quack, clinks, crown sting). The music bed and SFX sit at 50 % of the voice's gated RMS. The voice is unchanged.
