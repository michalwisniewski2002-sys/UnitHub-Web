// Each skin's motion: boot screen art, screen-change and tick effects, decoding headers, background textures
// and the animated backgrounds. Everything respects "Reduce motion" and the Skin effects switch.
import { VIBES } from "./skins.js";

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// MARK: Background textures (drawn once per theme into images)

function texture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  draw(ctx);
  return `url(${canvas.toDataURL()})`;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function sparklePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/// Sets the texture images for the current colours (marks are white on dark themes, ink on light ones).
export function paintTextures(root, palette) {
  const ink = palette.light ? palette.text : "#ffffff";
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  root.style.setProperty("--stars-image", texture(180, 180, (ctx) => {
    ctx.fillStyle = rgba(ink, 0.09);
    [[30, 40, 6], [128, 22, 3.5], [150, 120, 7], [62, 150, 4]].forEach(([x, y, r]) => sparklePath(ctx, x, y, r));
    ctx.fillStyle = rgba(ink, 0.08);
    [[90, 70], [12, 104], [170, 60], [110, 168], [48, 92]].forEach(([x, y]) => ctx.fillRect(x, y, 1.6, 1.6));
  }));
  root.style.setProperty("--noise-image", texture(96, 96, (ctx) => {
    const r = seeded(9);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rgba(ink, 0.05 + r() * 0.08);
      ctx.fillRect(r() * 96, r() * 96, 1 + r() * 2, 1);
    }
  }));
  root.style.setProperty("--leaves-image", texture(200, 200, (ctx) => {
    ctx.fillStyle = rgba(ink, 0.05);
    [[30, 40, 12, 30], [140, 30, 8, -40], [90, 120, 14, 80], [170, 160, 9, 10], [40, 170, 7, -70]].forEach(([x, y, s, a]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((a * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.9, -s * 0.4, s * 0.6, s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * 0.6, s * 0.6, -s * 0.9, -s * 0.4, 0, -s);
      ctx.fill();
      ctx.restore();
    });
  }));
  root.style.setProperty("--clouds-image", texture(1200, 260, (ctx) => {
    ctx.fillStyle = palette.light ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.05)";
    [[0.12, 50, 220], [0.55, 30, 300], [0.82, 80, 180], [0.32, 110, 140]].forEach(([x, y, w]) => {
      [[0, 0, 0.28], [0.22, -0.12, 0.34], [0.48, 0, 0.26], [0.24, 0.08, 0.3]].forEach(([dx, dy, r]) => {
        ctx.beginPath();
        ctx.ellipse(1200 * x + w * dx, y + w * dy, w * r, w * r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }));
}

// MARK: Decoding headers

/// Header text resolves into its real value in the skin's own way (symbols, type-on, runes, pixels…).
export function decode(el, vibe) {
  const glyphs = VIBES[vibe].glyphs;
  const text = el.dataset.text ?? el.textContent;
  el.dataset.text = text;
  if (!glyphs || reducedMotion()) return;
  if (glyphs === "typeon") {
    let i = 0;
    const step = () => {
      el.innerHTML = `${escape(text.slice(0, i))}▌<span style="color:transparent">${escape(text.slice(i + 1))}</span>`;
      if (++i <= text.length) setTimeout(step, 16); else el.textContent = text;
    };
    step();
    return;
  }
  const chars = [...text], steps = vibe === "hijack" ? 14 : 10;
  let s = 0;
  const tick = () => {
    const shown = Math.floor((chars.length * s) / steps);
    el.textContent = chars.map((c, i) => (i < shown || c === " " ? c : glyphs[Math.floor(Math.random() * glyphs.length)])).join("");
    if (++s < steps) setTimeout(tick, vibe === "arcane" ? 40 : 28); else el.textContent = text;
  };
  tick();
}

export function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// MARK: Screen change

export function screenChange(content, vibe) {
  if (reducedMotion()) return;
  content.classList.remove(...[...content.classList].filter((c) => c.startsWith("enter-")));
  void content.offsetWidth;
  content.classList.add(`enter-${vibe}`);
  const fx = (cls, style = "", html = "") => {
    const el = document.createElement("div");
    el.className = `fx ${cls}`;
    el.style.cssText = style;
    el.innerHTML = html;
    document.body.append(el);
    setTimeout(() => el.remove(), 1200);
  };
  const scatter = (count, symbol, colours, rise) => {
    for (let i = 0; i < count; i++) {
      fx("float", `left:${Math.random() * 90 + 5}vw; top:${rise ? 80 + Math.random() * 15 : 10 + Math.random() * 60}vh; color:${colours[i % colours.length]};
         --size:${12 + Math.random() * 14}px; --dx:${rise ? 0 : 30 + Math.random() * 40}vw; --dy:${rise ? -(160 + Math.random() * 220) : 40}px;
         --spin:${rise ? 0 : 180 + Math.random() * 180}deg; --dur:${rise ? 0.9 : 0.8}s`, symbol);
    }
  };
  if (vibe === "corporate") fx("redbar");
  if (vibe === "aero") fx("shine");
  if (vibe === "cute") scatter(7, "♥", ["var(--accent)", "var(--glitch)"], true);
  if (vibe === "grove") scatter(8, "🍃", ["var(--accent)"], false);
  if (vibe === "arcane") scatter(9, "✦", ["var(--accent)", "var(--glitch)"], false);
}

// MARK: Tick reactions

export function tickEffect(row, vibe) {
  if (reducedMotion()) return;
  const add = (cls, html = "", style = "", life = 1000) => {
    const el = document.createElement("div");
    el.className = `tickfx ${cls}`;
    el.innerHTML = html;
    el.style.cssText = style;
    row.append(el);
    setTimeout(() => el.remove(), life);
  };
  const burst = (n, symbol, colours, spread = 60) => {
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5;
      add("bit", symbol, `color:${colours[i % colours.length]}; --dx:${Math.cos(angle) * spread}px; --dy:${Math.sin(angle) * spread * 0.7}px; --spin:${i * 50}deg`);
    }
  };
  switch (vibe) {
    case "corporate": add("stamp", VIBES.corporate.stamp); break;
    case "hijack": add("glitchflash", "", "", 300); break;
    case "arcane": burst(8, "✦", ["var(--accent)", "var(--glitch)"]); break;
    case "cute": add("sticker", VIBES.cute.stamp); burst(5, "♥", ["var(--accent)", "var(--glitch)"], 44); break;
    case "ledger": add("pen"); break;
    case "grove": burst(6, "🍃", ["var(--accent)"], 50); break;
    case "aero": burst(5, "○", ["var(--accent)"], 56); break;
    case "pixel": add("coin", "● +XP"); break;
    default: add("sweep", "", "", 600);
  }
}

// MARK: Boot screen art

/// The art beside the boot readout. `step` counts printed lines; `done` is the final frame.
export function bootArt(vibe, step, steps) {
  const done = step >= steps, odd = step % 2 === 1, pct = Math.round((step / steps) * 100);
  switch (vibe) {
    case "terminal":
      return `<div class="label" style="border:2px solid var(--accent);width:240px;height:240px;display:grid;place-items:center;clip-path:var(--shape);box-shadow:0 0 12px var(--glow) inset">
        <div><div style="font-size:28px;font-weight:900;text-shadow:${odd ? -3 : -1}px 0 var(--glitch)">UNIT<span style="color:var(--accent)">//</span>HUB</div>
        <div style="color:var(--accent);font-size:11px;font-weight:700;margin-top:6px">JACK-IN · ${pct}%</div></div></div>`;
    case "corporate":
      return `<div class="label"><div style="font-size:120px;color:color-mix(in srgb,var(--accent) ${8 + pct / 10}%,transparent);font-weight:900;line-height:1;position:absolute;transform:translate(-20px,-30px)">荒坂</div>
        <div style="position:relative"><div style="width:30px;height:44px;background:var(--accent);margin:0 auto 14px"></div>
        <div style="font-size:34px;font-weight:900;letter-spacing:8px">ARASAKA</div>
        <div style="height:3px;background:var(--accent);width:${pct}%;margin:12px 0"></div>
        <div style="font-size:10px;letter-spacing:4px;color:${done ? "var(--accent)" : "var(--dim)"}">${done ? "ACCESS GRANTED" : "VERIFYING CREDENTIALS"}</div></div></div>`;
    case "hijack":
      return `<div class="label" style="text-align:center"><div style="font-size:40px;color:${odd ? "var(--glitch)" : "var(--accent)"}">⚠</div>
        <div style="font-size:30px;font-weight:900;text-shadow:${odd ? -5 : -2}px 1px var(--glitch),${odd ? 4 : 2}px -1px var(--accent)">UNIT//HUB</div>
        <div style="color:${odd || done ? "var(--accent)" : "var(--text)"};font-weight:700;margin-top:10px">${done ? ">> SYSTEM HIJACKED" : `>> BREACHING ICE · ${pct}%`}</div></div>`;
    case "arcane": {
      const face = done ? 20 : [7, 13, 4, 18, 11, 2, 16, 9, 19, 5, 14][step % 11];
      return `<div class="label" style="text-align:center"><div style="position:relative;width:200px;height:200px;margin:0 auto">
        <svg viewBox="-100 -100 200 200" width="200" height="200" style="transform:rotate(${pct * 7.2}deg);transition:transform .2s;filter:drop-shadow(0 0 ${done ? 14 : 4}px var(--glow))">
          <polygon points="0,-95 82,-47 82,47 0,95 -82,47 -82,-47" fill="color-mix(in srgb,var(--accent) 8%,transparent)" stroke="var(--accent)" stroke-width="3"/>
          <polygon points="0,-52 45,26 -45,26" fill="none" stroke="var(--accent)" stroke-opacity=".55"/>
          <path d="M0,-52L0,-95M0,-52L82,-47M0,-52L-82,-47M45,26L82,-47M45,26L82,47M45,26L0,95M-45,26L-82,-47M-45,26L-82,47M-45,26L0,95" stroke="var(--accent)" stroke-opacity=".55"/>
        </svg><div style="position:absolute;inset:0;display:grid;place-items:center;padding-top:16px;font:700 ${done ? 48 : 38}px Georgia,serif;color:${done ? "var(--accent)" : "var(--text)"}">${face}</div></div>
        <div style="font:600 ${done ? 20 : 13}px Georgia,serif;color:${done ? "var(--accent)" : "var(--muted)"};margin-top:10px">${done ? "NATURAL 20!" : "ROLLING FOR INITIATIVE…"}</div></div>`;
    }
    case "cute":
      return `<div class="label" style="text-align:center"><div style="position:relative;width:170px;height:${odd && !done ? 120 : 136}px;margin:${odd && !done ? 24 : 8}px auto 0;border:3px solid var(--accent);border-radius:50%;background:var(--panel);box-shadow:4px 6px 0 color-mix(in srgb,var(--glitch) 50%,transparent)">
        <div style="position:absolute;top:42%;left:0;right:0;display:flex;justify-content:center;gap:46px;font-size:18px;font-weight:900">${done ? "<span>^</span><span>^</span>" : odd ? "<span>—</span><span>—</span>" : "<span>●</span><span>●</span>"}</div>
        <div style="position:absolute;top:62%;left:0;right:0;display:flex;justify-content:center;gap:78px"><i style="width:22px;height:12px;border-radius:50%;background:color-mix(in srgb,var(--accent) 35%,transparent)"></i><i style="width:22px;height:12px;border-radius:50%;background:color-mix(in srgb,var(--accent) 35%,transparent)"></i></div>
        ${done ? `<div style="position:absolute;top:-40px;left:-20px;right:-20px;color:var(--accent);font-size:18px;letter-spacing:22px">♥♥♥♥</div>` : ""}</div>
        <div style="font-size:${done ? 22 : 13}px;font-weight:800;color:${done ? "var(--accent)" : "var(--muted)"};margin-top:20px;text-transform:none">${done ? "hi! ♡" : `waking up… ${pct}%`}</div></div>`;
    case "ledger": {
      const filled = Math.round((pct / 100) * 35);
      const cells = Array.from({ length: 35 }, (_, i) => `<i style="display:block;width:30px;height:18px;border:1px solid var(--border);background:${i < filled ? "var(--accent)" : "transparent"}"></i>`).join("");
      return `<div style="text-align:left"><div style="font:100 72px 'Segoe UI',system-ui;line-height:1">${pct}</div>
        <div style="height:1px;background:var(--border);width:250px;margin:14px 0"><div style="height:1px;background:var(--text);width:${pct}%"></div></div>
        <div style="display:grid;grid-template-columns:repeat(7,30px);gap:6px">${cells}</div>
        <div class="label" style="font-size:13px;color:var(--muted);margin-top:14px;text-transform:none">${done ? "Ready." : "Preparing your term"}</div></div>`;
    }
    case "grove": {
      const leaves = [[-50, -70], [40, -80], [-10, -105], [70, -45], [-75, -35], [15, -60], [-35, -95], [55, -100], [-60, -60], [30, -40], [0, -80], [-25, -50]];
      return `<div class="label" style="text-align:center"><div style="position:relative;width:280px;height:230px">
        <svg viewBox="0 0 280 230" width="280" height="230"><path d="M140 225 Q150 150 136 105 Q110 85 90 55 M136 105 Q170 85 195 45 M136 105 L140 20" fill="none" stroke="var(--muted)" stroke-width="4" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - pct / 100}"/></svg>
        ${leaves.map(([x, y], i) => `<span style="position:absolute;left:${140 + x}px;top:${130 + y}px;font-size:${16 + (i % 3) * 4}px;opacity:${(step / steps) * 12 > i ? 1 : 0};transform:rotate(${i * 37}deg)">🍃</span>`).join("")}
        ${[[-110, -100], [100, -90], [-90, 40], [120, 10], [-30, -120]].map(([x, y], i) => `<i style="position:absolute;left:${140 + x}px;top:${130 + y}px;width:5px;height:5px;border-radius:50%;background:var(--glitch);box-shadow:0 0 6px var(--glitch);opacity:${done || (i + step) % 2 === 0 ? 0.9 : 0.25}"></i>`).join("")}
        </div><div style="font-size:13px;font-weight:700;color:${done ? "var(--accent)" : "var(--muted)"}">${done ? "THE GROVE IS AWAKE" : `THE GROVE STIRS… ${pct}%`}</div></div>`;
    }
    case "aero":
      return `<div class="label" style="text-align:center"><div style="position:relative;width:260px;height:240px;display:grid;place-items:center">
        <i style="position:absolute;width:230px;height:70px;border:3px solid var(--accent);border-radius:50%;transform:rotate(${25 + pct * 3.6}deg)"></i>
        <i style="position:absolute;width:230px;height:70px;border:3px solid var(--glitch);border-radius:50%;transform:rotate(${-25 - pct * 3.6}deg)"></i>
        <i style="width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--accent) 60%);box-shadow:0 0 18px color-mix(in srgb,var(--accent) 50%,transparent),inset 0 -10px 20px rgb(0 0 0 / .15)"></i>
        </div><div style="font-size:${done ? 22 : 13}px;font-weight:800;color:${done ? "var(--accent)" : "var(--muted)"};text-transform:none">${done ? "Welcome!" : `Starting up… ${pct}%`}</div></div>`;
    case "pixel": {
      const blocks = Math.floor((pct / 100) * 10);
      const bar = (colour) => Array.from({ length: 10 }, (_, i) => `<i style="width:14px;height:12px;background:${i < blocks ? colour : "var(--border)"}"></i>`).join("");
      const heart = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"]
        .map((row) => [...row].map((b) => `<i style="width:11px;height:11px;background:${b === "1" ? "var(--overdue)" : "transparent"}"></i>`).join("")).join("");
      return `<div class="label" style="text-align:center"><div style="display:grid;grid-template-columns:repeat(8,11px);margin:0 auto 18px;width:88px;transform:translateY(${odd && !done ? -4 : 0}px)">${heart}</div>
        <div style="display:flex;gap:6px;align-items:center;justify-content:center;font-weight:900;font-size:12px">HP <span style="display:flex;gap:2px">${bar("var(--accent)")}</span></div>
        <div style="display:flex;gap:6px;align-items:center;justify-content:center;font-weight:900;font-size:12px;margin-top:6px">MP <span style="display:flex;gap:2px">${bar("var(--glitch)")}</span></div>
        <div style="font-size:16px;font-weight:900;color:var(--accent);margin-top:16px;opacity:${done || !odd ? 1 : 0.35}">${done ? "▶ PRESS START" : `LOADING ${pct}%`}</div></div>`;
    }
  }
  return "";
}

// MARK: Animated backgrounds

let ambient = null;

/// Starts or stops the skin's animated background (canvas particles, or a CSS sweep). Pauses while hidden.
export function setAmbient(enabled, vibe, palette) {
  ambient?.stop();
  ambient = null;
  if (!enabled || reducedMotion()) return;
  const sweeps = { terminal: ["down", 160, 9, `linear-gradient(transparent, color-mix(in srgb, var(--glitch) 4%, transparent), transparent)`],
                   corporate: ["down", 70, 6, `linear-gradient(transparent, color-mix(in srgb, var(--accent) 4%, transparent), color-mix(in srgb, var(--accent) 35%, transparent))`],
                   ledger: ["across", 3, 24, `linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 22%, transparent), transparent)`] };
  if (sweeps[vibe]) {
    const [dir, thick, dur, bg] = sweeps[vibe];
    const el = document.createElement("div");
    el.className = `sweep ${dir}`;
    el.style.cssText = `--thick:${thick}px; --dur:${dur}s; background:${bg}`;
    document.body.append(el);
    ambient = { stop: () => el.remove() };
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "ambient";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const colours = [palette.accent, palette.glitch];
  let particles = [], frame = 0, running = true, last = performance.now();
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  addEventListener("resize", resize);
  const kinds = {
    arcane: { rate: 1.9, life: 11, vy: -14, vx: 2, size: 3, shape: "sparkle" },
    cute: { rate: 2.2, life: 12, vy: -18, vx: 0, size: 6, shape: "heart" },
    grove: { rate: 1.1, life: 12, vy: 18, vx: 10, size: 6, shape: "leaf" },
    aero: { rate: 1.3, life: 12, vy: -26, vx: 0, size: 8, shape: "bubble" },
    pixel: { rate: 2, life: 10, vy: 0, vx: -12, size: 3, shape: "square" },
    hijack: { rate: 6, life: 0.22, vy: 0, vx: 0, size: 70, shape: "bar" },
  };
  const k = kinds[vibe];
  const spawn = () => particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, age: 0,
    life: k.life * (0.7 + Math.random() * 0.6), vx: k.vx * (0.5 + Math.random()), vy: k.vy * (0.5 + Math.random()),
    size: k.size * (0.6 + Math.random() * 0.8), colour: colours[Math.floor(Math.random() * 2)], spin: Math.random() * 6, alpha: 0.5 + Math.random() * 0.4 });
  const draw = (p) => {
    const fade = Math.min(1, p.age * 2, (p.life - p.age) * 1.5);
    ctx.globalAlpha = Math.max(0, fade * p.alpha * (palette.light ? 0.75 : 0.85));
    ctx.fillStyle = ctx.strokeStyle = p.colour;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin + p.age * 0.6);
    const s = p.size;
    switch (k.shape) {
      case "sparkle": sparklePath(ctx, 0, 0, s * 1.6); break;
      case "heart": ctx.beginPath(); ctx.moveTo(0, s * 0.8); ctx.bezierCurveTo(-s * 1.6, -s * 0.4, -s * 0.6, -s * 1.4, 0, -s * 0.4); ctx.bezierCurveTo(s * 0.6, -s * 1.4, s * 1.6, -s * 0.4, 0, s * 0.8); ctx.fill(); break;
      case "leaf": ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s, 0, 0, s); ctx.quadraticCurveTo(-s, 0, 0, -s); ctx.fill(); break;
      case "bubble": ctx.rotate(-(p.spin + p.age * 0.6)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha *= 0.8; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.35, s * 0.22, s * 0.15, -0.6, 0, Math.PI * 2); ctx.fill(); break;
      case "square": ctx.rotate(-(p.spin + p.age * 0.6)); ctx.fillRect(-s / 2, -s / 2, s, s); break;
      case "bar": ctx.rotate(-(p.spin + p.age * 0.6)); ctx.fillRect(-s, 0, s * 2 * (0.3 + p.alpha), 3); break;
    }
    ctx.restore();
  };
  const loop = (now) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      if (Math.random() < k.rate * dt * (k.shape === "bar" ? 1 : 1)) spawn();
      if (frame++ === 0) for (let i = 0; i < k.rate * k.life * 0.6; i++) { spawn(); particles.at(-1).age = Math.random() * particles.at(-1).life * 0.8; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter((p) => (p.age += dt) < p.life);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; draw(p); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  ambient = { stop: () => { running = false; canvas.remove(); removeEventListener("resize", resize); } };
}
