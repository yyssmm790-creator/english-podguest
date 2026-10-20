"""Create an original fingerpicked guitar-style loop (NumPy/SciPy + ffmpeg).
Not required for app builds: the generated MP3 is checked into public/audio.
"""
from pathlib import Path
import subprocess
import tempfile
import wave
import numpy as np
from scipy.signal import lfilter

RATE = 32000
BEAT = 60 / 82
LENGTH = 16 * 4 * BEAT
rng = np.random.default_rng(7218)
mix = np.zeros((int(LENGTH * RATE), 2), dtype=np.float64)
# Open guitar voicings: Cmaj7, Am7, Fmaj7, Gadd9. Original accompaniment.
chords = [[48, 55, 59, 64], [45, 55, 60, 64], [41, 57, 60, 64], [43, 57, 62, 67]]

def pluck(midi, strength, pan):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    size = int(RATE * 2.7)
    t = np.arange(size) / RATE
    sound = np.zeros(size)
    # Plucked-string partials: upper harmonics decay faster than the fundamental.
    for harmonic in range(1, 9):
        amplitude = np.sin(harmonic * np.pi * .21) / harmonic ** 1.35
        sound += amplitude * np.sin(2*np.pi*frequency*harmonic*t) * np.exp(-t*(.9 + harmonic*.48))
    sound *= 1 - np.exp(-t*240)
    sound += rng.normal(0,.025,size) * np.exp(-t*85)
    sound = lfilter([.18], [1, -.82], sound)
    sound /= max(.1, np.max(np.abs(sound)))
    return sound[:, None] * strength * np.array([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)])

for bar in range(16):
    chord = chords[bar % 4]
    pattern = [0, 2, 1, 3, 0, 2, 1, 3] if bar % 2 == 0 else [0, 1, 2, 3, 1, 2, 3, 2]
    for step, string in enumerate(pattern):
        position = int((bar * 4 + step * .5) * BEAT * RATE + rng.uniform(-.006,.006)*RATE)
        position = max(0, position)
        note = pluck(chord[string], (.35 if string == 0 else .23) * rng.uniform(.85,1.08), (string-1.5)*.19)
        indices = (np.arange(len(note)) + position) % len(mix)
        mix[indices] += note
# Short, quiet room reflections without a drum beat or piano.
for delay, gain in [(.047,.12), (.089,.075), (.143,.04)]:
    mix += np.roll(mix, int(delay*RATE), axis=0)[:, ::-1] * gain
mix *= .76 / max(1, np.max(np.abs(mix)))
with tempfile.TemporaryDirectory() as directory:
    wav = Path(directory) / 'acoustic.wav'
    with wave.open(str(wav), 'wb') as output:
        output.setnchannels(2); output.setsampwidth(2); output.setframerate(RATE)
        output.writeframes((mix * 32767).astype('<i2').tobytes())
    target = Path(__file__).resolve().parents[1] / 'public/audio/cafe-acoustic.mp3'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-af','loudnorm=I=-15:TP=-1:LRA=7','-codec:a','libmp3lame','-b:a','128k',str(target)],check=True)
    print(f'Created {target.name}: {LENGTH:.1f}s of original guitar-style fingerpicking')
