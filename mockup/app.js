// Bubbles emulator: plays the clip, pins one-sentence bubbles to tracked heads,
// and lets you switch visual direction live.

const W = 393, H = 852;
const TR = window.TRACKS;
const FPS = TR.fps;
const SCAN_SECONDS = 0.35;   // "analyzing" dots before the sentence lands
const VIDEO_W = 720, VIDEO_H = 1280;

// Who each tracked head is, and the one line that matters to *you*.
const PEOPLE = [
  { text: "I'm an aerospace researcher working on satellite autonomy.", match: 94, xp: 120, rarity: "Legendary", rar: "#ffb800" },
  { text: "How would I add a Redis cache to my project?", match: 81, xp: 60, rarity: "Rare", rar: "#3b9bff" },
  { text: "Need a teammate who knows ARKit, demo is tomorrow.", match: 67, xp: 40, rarity: "Uncommon", rar: "#2ee66b" },
];
const TILTS = [-3, 2.5, -1.5];
const BADGES = {
  xp: (p) => `+${p.xp} XP`,
  match: (p) => `${p.match}% match`,
  rarity: (p) => p.rarity,
  lvl: (p) => `Lv ${Math.round(p.match / 7)}`,
};
// BLE-only people the radar hears but the camera does not see.
const GHOSTS = [{ a: -150, r: 0.78 }, { a: 128, r: 0.62 }];

const FONTS = {
  "Inter": "Inter, sans-serif",
  "SF Pro (system)": "-apple-system, 'SF Pro Text', system-ui, sans-serif",
  "Fredoka": "Fredoka, sans-serif",
  "Space Grotesk": "'Space Grotesk', sans-serif",
  "Bricolage Grotesque": "'Bricolage Grotesque', sans-serif",
  "Archivo Black": "'Archivo Black', sans-serif",
  "Instrument Serif": "'Instrument Serif', serif",
  "JetBrains Mono": "'JetBrains Mono', monospace",
  "DM Sans": "'DM Sans', sans-serif",
  "Manrope": "Manrope, sans-serif",
  "Sora": "Sora, sans-serif",
  "Silkscreen": "Silkscreen, monospace",
  "Bangers": "Bangers, sans-serif",
  "Chakra Petch": "'Chakra Petch', sans-serif",
  "VT323": "VT323, monospace",
  "Lilita One": "'Lilita One', sans-serif",
};
const SHAPES = ["pill", "card", "comic", "block", "imessage", "hud", "label", "pixel", "angled", "diecut"];
const ANIMS = ["pop", "rise", "slam", "fade", "type"];

const PRESETS = [
  { id: "glass", name: "Glass", note: "visionOS frosted pill",
    font: "Inter", shape: "pill", anim: "rise", size: 16, accent: "#0a84ff", bg: "#ffffff", alpha: 0.8,
    vars: { "--weight": 600, "--blur": "18px", "--bub-fg": "#111", "--bub-border": "rgba(255,255,255,.75)", "--bw": "1px",
            "--shadow": "0 10px 30px rgba(0,0,0,.22)", "--ui-bg": "rgba(255,255,255,.28)", "--ui-fg": "#fff" } },
  { id: "pocket", name: "Pocket Pop", note: "game style, thick ink",
    font: "Fredoka", shape: "comic", anim: "pop", size: 17, accent: "#ffcb05", bg: "#ffffff", alpha: 1,
    vars: { "--weight": 600, "--bub-fg": "#1b1b1b", "--bub-border": "#1b1b1b", "--bw": "3px",
            "--shadow": "0 5px 0 #1b1b1b", "--ui-bg": "rgba(27,27,27,.72)", "--ui-fg": "#fff" } },
  { id: "neon", name: "Neon", note: "dark glass, cyan glow",
    font: "Space Grotesk", shape: "card", anim: "type", size: 15, accent: "#00f0ff", bg: "#0a0a19", alpha: 0.8,
    vars: { "--weight": 500, "--blur": "10px", "--bub-fg": "#e8fbff", "--bub-border": "#00f0ff", "--bw": "1.5px",
            "--shadow": "0 0 22px rgba(0,240,255,.45)", "--radius": "12px", "--ui-bg": "rgba(10,10,25,.7)", "--ui-fg": "#e8fbff" } },
  { id: "comic", game: true, name: "Comic", note: "warm paper, punchy type",
    font: "Bricolage Grotesque", shape: "comic", anim: "pop", size: 16, accent: "#ff4d2e", bg: "#fff3b0", alpha: 1,
    vars: { "--weight": 800, "--bub-fg": "#111", "--bub-border": "#111", "--bw": "2.5px",
            "--shadow": "0 6px 18px rgba(0,0,0,.25)", "--ui-bg": "rgba(17,17,17,.7)", "--ui-fg": "#fff3b0" }, badge: "match" },
  { id: "message", name: "Message", note: "feels like a text",
    font: "SF Pro (system)", shape: "imessage", anim: "pop", size: 16, accent: "#0a84ff", bg: "#0a84ff", alpha: 1,
    vars: { "--weight": 500, "--bub-fg": "#fff", "--shadow": "0 8px 22px rgba(0,0,0,.25)",
            "--ui-bg": "rgba(30,30,32,.6)", "--ui-fg": "#fff" } },
  { id: "sticker", game: true, name: "Sticker", note: "loud block, hard shadow",
    font: "Archivo Black", shape: "block", anim: "slam", size: 15, accent: "#ff2e88", bg: "#ffe600", alpha: 1,
    vars: { "--weight": 400, "--bub-fg": "#000", "--bub-border": "#000", "--bw": "2px", "--tracking": "-.01em",
            "--shadow": "5px 5px 0 #000", "--ui-bg": "rgba(0,0,0,.75)", "--ui-fg": "#ffe600" }, badge: "xp" },
  { id: "editorial", name: "Editorial", note: "serif italic, calm",
    font: "Instrument Serif", shape: "card", anim: "fade", size: 21, accent: "#c2410c", bg: "#f6f1e7", alpha: 0.96,
    vars: { "--weight": 400, "--style": "italic", "--bub-fg": "#1d1a16", "--bub-border": "#1d1a16", "--bw": "1px",
            "--radius": "6px", "--shadow": "0 12px 30px rgba(0,0,0,.25)", "--ui-bg": "rgba(246,241,231,.85)", "--ui-fg": "#1d1a16" } },
  { id: "hud", game: true, name: "HUD", note: "terminal, types itself out",
    font: "JetBrains Mono", shape: "hud", anim: "type", size: 13.5, accent: "#7cffb2", bg: "#00140a", alpha: 0.6,
    vars: { "--weight": 500, "--blur": "6px", "--bub-fg": "#7cffb2", "--shadow": "none",
            "--ui-bg": "rgba(0,20,10,.6)", "--ui-fg": "#7cffb2" }, badge: "lvl" },
  { id: "soft", name: "Soft", note: "pastel gradient, friendly",
    font: "DM Sans", shape: "pill", anim: "pop", size: 16, accent: "#9b5cff", bg: "#ffd1e8", alpha: 1, gradient: "#cfe3ff",
    vars: { "--weight": 700, "--bub-fg": "#2a1840", "--shadow": "0 10px 28px rgba(155,92,255,.35)",
            "--ui-bg": "rgba(255,255,255,.35)", "--ui-fg": "#2a1840" } },
  { id: "label", name: "Label", note: "no box, AR tag + leader line",
    font: "Manrope", shape: "label", anim: "rise", size: 17, accent: "#ff5a1f", bg: "#000000", alpha: 0,
    vars: { "--weight": 800, "--bub-fg": "#fff", "--ui-bg": "rgba(0,0,0,.45)", "--ui-fg": "#fff" } },

  // ---- game family: riffs on Comic, Sticker, HUD ----
  { id: "arcade", game: true, isNew: true, name: "Arcade", note: "8-bit pixel frame, +XP",
    font: "Silkscreen", shape: "pixel", anim: "type", size: 14, accent: "#ff3df0", bg: "#1a1033", alpha: 0.94, badge: "xp",
    vars: { "--weight": 400, "--bub-fg": "#fff", "--bub-border": "#ffffff", "--tracking": ".01em",
            "--ui-bg": "rgba(26,16,51,.85)", "--ui-fg": "#fff", "--badge-fg": "#1a1033" } },
  { id: "manga", game: true, isNew: true, name: "Manga", note: "halftone ink, tilted, slams in",
    font: "Bangers", shape: "comic", anim: "slam", size: 20, accent: "#e4002b", bg: "#ffffff", alpha: 1, tilt: true, badge: "match",
    pattern: "radial-gradient(rgba(0,0,0,.14) 1.1px, transparent 1.4px) 0 0 / 6px 6px",
    vars: { "--weight": 400, "--tracking": ".035em", "--bub-fg": "#111", "--bub-border": "#111", "--bw": "3px",
            "--shadow": "4px 4px 0 #111", "--ui-bg": "rgba(17,17,17,.78)", "--ui-fg": "#fff", "--badge-fg": "#fff" } },
  { id: "loot", game: true, isNew: true, name: "Loot Card", note: "rarity border + holo shine",
    font: "Chakra Petch", shape: "angled", anim: "pop", size: 15, accent: "#ffb800", bg: "#12141c", alpha: 0.92, badge: "rarity",
    vars: { "--weight": 600, "--bub-fg": "#fff", "--ui-bg": "rgba(18,20,28,.8)", "--ui-fg": "#fff", "--badge-fg": "#111" } },
  { id: "boss", game: true, isNew: true, name: "Boss Bar", note: "RPG nameplate, match meter",
    font: "Chakra Petch", shape: "hud", anim: "rise", size: 15, accent: "#ff3b3b", bg: "#140707", alpha: 0.82, badge: "lvl",
    vars: { "--weight": 700, "--blur": "6px", "--bub-fg": "#fff", "--shadow": "0 8px 24px rgba(0,0,0,.45)",
            "--ui-bg": "rgba(20,7,7,.75)", "--ui-fg": "#fff", "--badge-fg": "#fff" } },
  { id: "crt", game: true, isNew: true, name: "Amber CRT", note: "retro terminal, scanlines",
    font: "VT323", shape: "hud", anim: "type", size: 21, accent: "#ffb000", bg: "#1a0f00", alpha: 0.8, badge: "xp",
    pattern: "repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px)",
    vars: { "--weight": 400, "--blur": "4px", "--bub-fg": "#ffb000", "--shadow": "0 0 20px rgba(255,176,0,.3)",
            "--ui-bg": "rgba(26,15,0,.75)", "--ui-fg": "#ffb000", "--badge-fg": "#1a0f00" } },
  { id: "diecut", game: true, isNew: true, name: "Die-cut", note: "peel-off sticker, white edge",
    font: "Lilita One", shape: "diecut", anim: "slam", size: 17, accent: "#00d1ff", bg: "#ff4fa3", alpha: 1, tilt: true, badge: "xp",
    vars: { "--weight": 400, "--bub-fg": "#fff", "--bub-border": "#ffffff", "--bw": "4px", "--tracking": ".01em",
            "--shadow": "0 8px 16px rgba(0,0,0,.35)", "--ui-bg": "rgba(0,0,0,.6)", "--ui-fg": "#fff", "--badge-fg": "#111" } },
];

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

// Style state = preset + overrides.
const state = { badges: true, preset: PRESETS.find((p) => p.id === "manga"), font: null, shape: null, anim: null, size: null, accent: null, bg: null };

function styleFor(p, o = {}) {
  const bgHex = o.bg || p.bg;
  const vars = {
    "--font": FONTS[o.font || p.font], "--fs": (o.size || p.size) + "px",
    "--accent": o.accent || p.accent,
    "--radius": "22px", "--blur": "0px", "--bw": "0px", "--bub-border": "transparent",
    "--style": "normal", "--tracking": "0",
    ...p.vars,
  };
  const alpha = p.alpha === 0 && o.bg ? 0.85 : p.alpha;
  if (p.gradient && !o.bg) {
    vars["--bub-bg"] = `linear-gradient(135deg, ${p.bg}, ${p.gradient})`;
    vars["--tail-bg"] = p.gradient;
  } else {
    vars["--bub-bg"] = hexA(bgHex, alpha);
    vars["--tail-bg"] = hexA(bgHex, alpha);
  }
  if (p.pattern) vars["--bub-bg"] = `${p.pattern}, ${vars["--bub-bg"]}`;
  if (o.bg && alpha > 0) vars["--bub-fg"] = lum(bgHex) > 0.6 ? "#111" : "#fff";
  const badge = o.badges === false ? null : p.badge || null;
  return { vars, shape: o.shape || p.shape, anim: o.anim || p.anim, theme: p.id, tilt: !!p.tilt, badge };
}

function applyStyle(screen, st) {
  for (const [k, v] of Object.entries(st.vars)) screen.style.setProperty(k, v);
  screen.dataset.shape = st.shape;
  screen.dataset.theme = st.theme;
  screen.dataset.tilt = st.tilt ? "1" : "0";
  screen.querySelectorAll(".bub").forEach((b, i) => {
    b.dataset.anim = st.anim;
    const badge = b.querySelector(".bub-badge");
    badge.textContent = st.badge ? BADGES[st.badge](PEOPLE[i]) : "";
    b.classList.toggle("has-badge", !!st.badge);
  });
}

// Map normalized video coordinates to screen pixels (object-fit: cover).
const coverScale = Math.max(W / VIDEO_W, H / VIDEO_H);
const offX = (W - VIDEO_W * coverScale) / 2, offY = (H - VIDEO_H * coverScale) / 2;
const toScreen = (x, y) => [offX + x * VIDEO_W * coverScale, offY + y * VIDEO_H * coverScale];

function headAt(person, f) {
  const i = f - person.start;
  if (i < 0 || i > person.frames.length - 1) return null;
  const a = person.frames[Math.floor(i)], b = person.frames[Math.min(person.frames.length - 1, Math.ceil(i))];
  const r = i - Math.floor(i);
  const x = a[0] + (b[0] - a[0]) * r, y = a[1] + (b[1] - a[1]) * r, s = a[2] + (b[2] - a[2]) * r;
  const [sx, sy] = toScreen(x, y);
  return { sx, sy, size: s * VIDEO_W * coverScale };
}

// One renderer per screen (the live phone, and each still in Compare).
class Renderer {
  constructor(screen) {
    this.screen = screen;
    this.overlay = screen.querySelector(".overlay");
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.overlay.append(this.svg);
    this.blipsEl = screen.querySelector("#blips, .blips");
    this.items = TR.people.map((p, i) => {
      const el = document.createElement("div");
      el.className = "bub";
      el.innerHTML = '<div class="bub-body"><span class="bub-text"></span><div class="bub-meter"><i></i></div></div><div class="bub-tail"></div><div class="bub-badge"></div>';
      const who = PEOPLE[i];
      el.style.setProperty("--tilt", TILTS[i] + "deg");
      el.style.setProperty("--rar", who.rar);
      el.style.setProperty("--m", who.match + "%");
      this.overlay.append(el);
      const blip = document.createElement("div");
      blip.className = "blip";
      this.blipsEl.append(blip);
      return { p, el, text: el.querySelector(".bub-text"), blip, phase: "off", x: null, y: null, typed: -1 };
    });
    for (const g of GHOSTS) {
      const b = document.createElement("div");
      b.className = "blip";
      this.place(b, g.a, g.r);
      this.blipsEl.append(b);
    }
    this.debug = false;
  }

  place(blip, angleDeg, r) {
    const a = (angleDeg - 90) * Math.PI / 180;
    blip.style.left = 50 + Math.cos(a) * r * 44 + "%";
    blip.style.top = 50 + Math.sin(a) * r * 44 + "%";
  }

  render(t, snap = false) {
    const f = t * FPS;
    const boxes = [];
    let seen = 0;

    for (const it of this.items) {
      const h = headAt(it.p, f);
      const visible = h && h.sx > -30 && h.sx < W + 30;
      if (h) h.sx = Math.max(8, Math.min(W - 8, h.sx));
      if (!visible) {
        it.el.classList.remove("show", "enter");
        it.phase = "off"; it.blip.classList.remove("on");
        it.x = null;
        continue;
      }
      seen++;
      const age = t - it.p.start / FPS;
      const phase = age < SCAN_SECONDS ? "scan" : "ready";
      const idx = this.items.indexOf(it);
      const full = PEOPLE[idx].text;
      const a = it.el.dataset.anim;

      if (phase !== it.phase) {
        it.el.classList.remove("enter");
        if (phase === "scan") it.text.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
        else { void it.el.offsetWidth; it.el.classList.add("enter"); }
        it.phase = phase; it.typed = -1; it.el.dataset.phase = phase;
        it.w = null;
      }
      if (phase === "ready") {
        const n = a === "type" && !snap ? Math.min(full.length, Math.floor((age - SCAN_SECONDS) * 55)) : full.length;
        if (n !== it.typed) {
          if (a === "type") {
            // Reserve full size so the bubble does not resize while typing.
            it.text.innerHTML = `<span>${full.slice(0, n)}</span>${n < full.length ? '<span class="caret"></span>' : ""}<span style="visibility:hidden">${full.slice(n)}</span>`;
          } else it.text.textContent = full;
          it.typed = n;
        }
      }
      it.el.classList.add("show");
      it.blip.classList.toggle("on", phase === "ready");
      // radar: bearing from screen x, distance from head size
      const bearing = ((h.sx / W) - 0.5) * 70;
      const dist = Math.max(0.2, Math.min(0.92, 1 - h.size / 80));
      this.place(it.blip, bearing, dist);

      if (it.w == null) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
      const gap = this.screen.dataset.shape === "label" ? 26 : 14;
      let left = Math.max(10, Math.min(W - 10 - it.w, h.sx - it.w / 2));
      let top = h.sy - gap - it.h;
      boxes.push({ it, h, left, top, w: it.w, hgt: it.h });
    }

    // Crowded: slide each bubble toward its own side so tails and stems stay clear,
    // then stack vertically; the further (higher) head goes on top.
    const overlaps = (A, B) => A.left < B.left + B.w && B.left < A.left + A.w && A.top < B.top + B.hgt && B.top < A.top + A.hgt;
    boxes.sort((a, b) => a.h.sx - b.h.sx);
    for (let i = 1; i < boxes.length; i++) {
      const L = boxes[i - 1], R = boxes[i];
      if (!overlaps(L, R)) continue;
      L.left = Math.max(10, Math.min(L.left, L.h.sx - L.w + 22));
      R.left = Math.min(W - 10 - R.w, Math.max(R.left, R.h.sx - 22));
    }
    boxes.sort((a, b) => b.h.sy - a.h.sy);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = 0; j < i; j++) {
        const A = boxes[j], B = boxes[i];
        const overlapX = A.left < B.left + B.w && B.left < A.left + A.w;
        if (overlapX && B.top + B.hgt + 8 > A.top) B.top = A.top - B.hgt - 8;
      }
    }

    let svg = "";
    for (const b of boxes) {
      const { it, h } = b;
      const k = snap || it.x == null ? 1 : 0.45;  // light smoothing
      it.x = it.x == null ? b.left : it.x + (b.left - it.x) * k;
      it.y = it.y == null || k === 1 ? b.top : it.y + (b.top - it.y) * k;
      it.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
      const tx = Math.max(18, Math.min(b.w - 18, h.sx - it.x));
      it.el.style.setProperty("--tx", tx + "px");
      it.el.style.setProperty("--ox", tx + "px");
      const tipY = it.y + b.hgt + (this.screen.dataset.shape === "comic" ? 9 : 6);
      if (h.sy - tipY > 10) svg += `<line class="stem" x1="${it.x + tx}" y1="${tipY}" x2="${h.sx}" y2="${h.sy - 3}"/>`;
      svg += `<circle class="headdot" cx="${h.sx}" cy="${h.sy}" r="3.5"/>`;
      if (this.debug) svg += `<circle class="debugdot" cx="${h.sx}" cy="${h.sy}" r="6" fill-opacity=".6"/>`;
    }
    this.svg.innerHTML = svg;

    const st = this.screen.querySelector(".scanpill span:last-child");
    if (st) st.textContent = seen ? `${seen} in view · ${seen + GHOSTS.length} nearby` : `Scanning · ${GHOSTS.length} nearby`;
  }
}

// ---------- live phone ----------
const screen = document.getElementById("screen");
const video = document.getElementById("feed");
const live = new Renderer(screen);

function restyle() {
  const st = styleFor(state.preset, state);
  applyStyle(screen, st);
  live.items.forEach((it) => { it.phase = "off"; it.w = null; });
  syncControls();
}

let lastT = 0;
function tick() {
  const t = video.currentTime;
  if (t < lastT - 0.5) live.items.forEach((it) => { it.phase = "off"; it.x = null; });
  lastT = t;
  live.render(t);
  if (!scrubbing) scrub.value = Math.round((t / (video.duration || 1)) * 1000);
  requestAnimationFrame(tick);
}

// ---------- controls ----------
const $ = (id) => document.getElementById(id);
const presetsEl = $("presets");
PRESETS.forEach((p) => {
  const b = document.createElement("button");
  b.className = "preset";
  b.innerHTML = `<b>${p.name}${p.isNew ? ' <em>new</em>' : ""}</b><small>${p.note}</small>`;
  if (p.game) b.classList.add("game");
  b.onclick = () => { Object.assign(state, { preset: p, font: null, shape: null, anim: null, size: null, accent: null, bg: null }); restyle(); };
  p.btn = b;
  presetsEl.append(b);
});
const fill = (sel, list) => list.forEach((v) => sel.append(new Option(v, v)));
fill($("font"), Object.keys(FONTS));
fill($("shape"), SHAPES);
fill($("anim"), ANIMS);

function syncControls() {
  const p = state.preset;
  PRESETS.forEach((x) => x.btn.setAttribute("aria-pressed", x === p));
  $("font").value = state.font || p.font;
  $("shape").value = state.shape || p.shape;
  $("anim").value = state.anim || p.anim;
  $("size").value = state.size || p.size;
  $("sizeval").textContent = (state.size || p.size) + "px";
  $("accent").value = state.accent || p.accent;
  $("bg").value = state.bg || p.bg;
}
$("font").onchange = (e) => { state.font = e.target.value; restyle(); };
$("shape").onchange = (e) => { state.shape = e.target.value; restyle(); };
$("anim").onchange = (e) => { state.anim = e.target.value; restyle(); };
$("size").oninput = (e) => { state.size = +e.target.value; restyle(); };
$("accent").oninput = (e) => { state.accent = e.target.value; restyle(); };
$("bg").oninput = (e) => { state.bg = e.target.value; restyle(); };

const toggle = (id, sel) => { $(id).onchange = (e) => { screen.querySelector(sel).style.opacity = e.target.checked ? 1 : 0; }; };
toggle("t-radar", ".radar"); toggle("t-me", ".me"); toggle("t-scan", ".scanpill");
$("t-debug").onchange = (e) => { live.debug = e.target.checked; };
$("t-badge").onchange = (e) => { state.badges = e.target.checked; restyle(); };

const play = $("play"), scrub = $("scrub"), speed = $("speed");
let scrubbing = false;
play.onclick = () => { video.paused ? video.play() : video.pause(); };
video.onplay = () => (play.textContent = "Pause");
video.onpause = () => (play.textContent = "Play");
scrub.oninput = () => { scrubbing = true; video.pause(); video.currentTime = (scrub.value / 1000) * video.duration; };
scrub.onchange = () => { scrubbing = false; };
speed.onchange = () => { video.playbackRate = +speed.value; };
video.playbackRate = 0.5;
video.addEventListener("loadedmetadata", () => { video.playbackRate = +speed.value; });

// Fit phone to viewport height.
function fit() {
  const s = Math.min(1, (innerHeight - 90) / 876);
  $("phone").style.setProperty("--scale", Math.max(0.55, s).toFixed(3));
}
addEventListener("resize", fit); fit();

// ---------- compare ----------
const COMPARE_T = 30 / FPS;
function buildCompare(gameOnly) {
  const grid = $("comparegrid");
  grid.innerHTML = "";
  $("comparetitle").textContent = gameOnly ? "Game set, same frame" : "All directions, same frame";
  for (const p of PRESETS.filter((x) => !gameOnly || x.game)) {
    const wrap = document.createElement("div");
    wrap.className = "mini";
    const frame = document.createElement("div");
    frame.className = "mini-frame";
    const sc = screen.cloneNode(true);
    sc.removeAttribute("id");
    sc.querySelector("video").replaceWith(Object.assign(document.createElement("img"), { className: "still", src: "assets/still.jpg", alt: "" }));
    sc.querySelector(".overlay").innerHTML = "";
    const bl = sc.querySelector("#blips"); bl.removeAttribute("id"); bl.className = "blips"; bl.innerHTML = "";
    frame.append(sc);
    wrap.append(frame, Object.assign(document.createElement("span"), { textContent: p.name + (p.isNew ? " (new)" : "") }));
    wrap.onclick = () => { p.btn.click(); $("comparebox").hidden = true; };
    grid.append(wrap);
    const r = new Renderer(sc);
    applyStyle(sc, styleFor(p, { badges: state.badges }));
    // render twice: first measures the dots state, second lands the sentence
    r.render(COMPARE_T, true);
    r.items.forEach((it) => it.el.classList.remove("enter"));
  }
}
$("compare").onclick = () => { $("comparebox").hidden = false; buildCompare(false); };
$("comparegame").onclick = () => { $("comparebox").hidden = false; buildCompare(true); };
$("closecompare").onclick = () => { $("comparebox").hidden = true; };

restyle();
document.fonts.ready.then(() => live.items.forEach((it) => (it.w = null)));
requestAnimationFrame(tick);
