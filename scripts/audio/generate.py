"""Generates NoniOS's two UI sounds as 16-bit mono WAVs using only the standard
library, so the assets are reproducible and no binary blob of unknown origin
lands in the repo. Mirrors the prototype's Web Audio chords (DESIGN.md ->
Home -> Sound): a short ascending chord on tap, two warm tones on returning.

Run from the repo root:  python3 scripts/audio/generate.py
"""

import math
import struct
import wave
from pathlib import Path

RATE = 44_100
OUT = Path(__file__).resolve().parents[2] / "src" / "assets" / "audio"


def tone(freqs, duration, start=0.0, gain=0.16, total=None):
    """Sine chord with a 20 ms attack and an exponential decay, as in the prototype."""
    total = total or (start + duration + 0.05)
    samples = [0.0] * int(RATE * total)
    for f in freqs:
        for i in range(int(RATE * duration)):
            t = i / RATE
            env = min(1.0, t / 0.02) * (0.0001 / 1.0) ** (t / duration)
            samples[int(RATE * start) + i] += gain * env * math.sin(2 * math.pi * f * t)
    return samples


def mix(*layers):
    length = max(len(layer) for layer in layers)
    out = [0.0] * length
    for layer in layers:
        for i, value in enumerate(layer):
            out[i] += value
    return out


def write(name, samples):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))
    print(f"wrote {path.relative_to(Path.cwd())} ({len(samples) / RATE:.2f}s)")


if __name__ == "__main__":
    write("tap.wav", tone([523.25, 784.0], 0.4))
    write(
        "return-home.wav",
        mix(tone([392.0, 587.33], 0.7, 0.0, 0.12, 1.1), tone([784.0], 0.9, 0.12, 0.08, 1.1)),
    )
