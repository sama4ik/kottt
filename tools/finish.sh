#!/usr/bin/env bash
# finish.sh "Title": one linear gain to -14 LUFS + -1 dBFS peak limiter on the whole mix, mux with the picture
# (video stream copied, no re-encode), then QA: freeze/black detection, loudness, contact sheet.
set -e
cd "$(dirname "$0")/.."
PY=${PYTHON:-python}
TITLE="${1:-Ice King}"
SLUG=$(echo "$TITLE" | tr ' ' '-' | tr -cd 'A-Za-z0-9-')
I=$(ffmpeg -hide_banner -nostats -i audio/mix.wav -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$($PY -c "print(round(-14 - ($I), 2))")
echo "mix integrated $I LUFS -> gain $G dB"
OUT="out/${SLUG}.mp4"
ffmpeg -y -v error -i out/video_noaudio.mp4 -i audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy \
  -af "volume=${G}dB,alimiter=limit=0.84:attack=5:release=50:level=false" -c:a aac -b:a 192k -ar 48000 \
  -metadata title="$TITLE" -movflags +faststart -shortest "$OUT"
echo "== probe"; ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,sample_rate:format=duration,size -of compact "$OUT"
echo "== loudness"; ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true:framelog=quiet -f null - 2>&1 | grep -E "^\s+(I|Peak|LRA):" | tr -s ' '
echo "== freeze/black (empty = clean)"; ffmpeg -hide_banner -nostats -i "$OUT" -vf "freezedetect=n=0.002:d=0.4,blackdetect=d=0.1:pix_th=0.08" -an -f null - 2>&1 | grep -E "freeze_(start|duration)|black_start" || true
ffmpeg -y -v error -i "$OUT" -vf "fps=1/2,scale=216:-1,tile=6x4" -frames:v 1 out/qa_sheet.jpg
echo "DONE $OUT"
