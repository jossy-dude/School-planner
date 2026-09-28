"""Procedurally synthesizes the app's sound effects (no samples, no licensing):
pure sine/noise math written to 16-bit mono WAV. Re-run to regenerate:
    python3 tools/make_sounds.py
"""
import math, random, struct, wave

RATE = 44100

def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = 0.85 * 32767 / peak
    with wave.open(f"assets/sounds/{name}.wav", "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s * scale)) for s in samples))

def bell(freq, dur, decay, partials=((1, 1.0), (2.0, 0.35), (3.01, 0.15))):
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * decay) * min(1.0, t * 400)  # 2.5ms attack click guard
        out.append(env * sum(a * math.sin(2 * math.pi * freq * m * t) for m, a in partials))
    return out

def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(n)]

def offset(track, sec):
    return [0.0] * int(RATE * sec) + track

# tick: dry woodblock-ish click
random.seed(7)
tick = []
for i in range(int(RATE * 0.06)):
    t = i / RATE
    tick.append(math.exp(-t * 90) * (math.sin(2 * math.pi * 1500 * t) * 0.8 + (random.random() - 0.5) * 0.4))
write("tick", tick)

# start: quick rising two-note blip
write("start", mix(bell(660, 0.28, 12), offset(bell(990, 0.4, 10), 0.09)))

# done: four-note major arpeggio chime, long bell tail
write("done", mix(
    bell(523.25, 1.8, 3.2),
    offset(bell(659.25, 1.7, 3.2), 0.16),
    offset(bell(783.99, 1.6, 3.2), 0.32),
    offset(bell(1046.5, 2.0, 2.6), 0.48),
))

# pop: descending sweep "bloop" for the droplet pinching off
pop, phase = [], 0.0
for i in range(int(RATE * 0.16)):
    t = i / RATE
    f = 900 * math.exp(-t * 11) + 180
    phase += 2 * math.pi * f / RATE
    pop.append(math.exp(-t * 20) * math.sin(phase))
write("pop", pop)
print("wrote", ["tick", "start", "done", "pop"])
