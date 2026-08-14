// Celebration for putting the site live: a confetti burst plus a short cheer.
//
// The confetti is a few hundred rectangles on a throwaway canvas — no
// dependency. The cheer is a real crowd recording at /sounds/cheer.mp3
// (public domain, see docs/cheer-sound.md); if it ever fails to load we fall
// back to a synthesised one so the button still celebrates.

const COLORS = ["#0891B2", "#10B981", "#38BDF8", "#F59E0B", "#A78BFA", "#FFFFFF"];
const CHEER_URL = "/sounds/cheer.mp3";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rot: number;
  vrot: number;
  life: number;
}

function confetti(durationMs = 2600) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const parts: Particle[] = [];
  const spawn = (ox: number, oy: number, angle: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const speed = 9 + Math.random() * 9;
      parts.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.35,
        life: 1,
      });
    }
  };

  // Two cannons from the bottom corners angled inward, plus a centre burst.
  spawn(0, h, -Math.PI / 3.2, 70);
  spawn(w, h, -Math.PI + Math.PI / 3.2, 70);
  spawn(w / 2, h * 0.78, -Math.PI / 2, 50);

  const start = performance.now();
  const tick = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.32; // gravity
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (elapsed > durationMs * 0.55) p.life -= 0.018;
      if (p.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < durationMs) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

// Filtered noise that swells and falls away (the crowd) under a rising
// four-note fanfare. Reads as a cheer without shipping an audio file.
function synthCheer() {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;

  const ac = new Ctor();
  const now = ac.currentTime;
  const dur = 1.8;

  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1100;
  band.Q.value = 0.7;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.16, now + 0.25);
  noiseGain.gain.setValueAtTime(0.16, now + 0.9);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(band).connect(noiseGain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + dur);

  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const at = now + i * 0.11;
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.13, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + 0.65);
  });

  window.setTimeout(() => void ac.close(), 2600);
}

async function cheer() {
  try {
    const audio = new Audio(CHEER_URL);
    audio.volume = 0.6;
    // Rejects if the file is missing or the browser won't play it.
    await audio.play();
    return;
  } catch {
    // Fall through to the synthesised cheer.
  }
  synthCheer();
}

/** Confetti + cheer. Must be called from a user gesture so audio is allowed. */
export function celebrate() {
  if (typeof window === "undefined") return;
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!still) confetti();
  void cheer();
}
