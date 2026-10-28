// UnitHub for the web: the same study planner as the Mac app, for Windows (and any browser).
// Made by Michal · Michal Tech.
import * as D from "./data.js";
import { state, save } from "./data.js";
import { SKINS, VIBES, skinById } from "./skins.js";
import { play, PACK_NAMES } from "./sound.js";
import * as FX from "./effects.js";

const esc = FX.escape;
const VERSION = "3.0";
const root = document.documentElement;
const app = document.getElementById("app");

let screen = "week";
let filters = { unit: "all", search: "", status: "todo" };
let expanded = new Set();
let syncStatus = "";
let installPrompt = null;

// MARK: Skin and theme

const skin = () => skinById(state.skin);
const palette = () => {
  const s = skin();
  return s.palettes.find((p) => p.id === state.palettes[s.id]) ?? s.palettes[0];
};
const vibe = () => skin().vibe;
const words = () => VIBES[vibe()];
const sound = (name) => play(name, skin().sounds, state.settings.sounds);
const effectsOn = () => state.settings.effects && !FX.reducedMotion();

function applySkin() {
  const s = skin(), p = palette();
  for (const key of ["background", "panel", "hover", "border", "text", "muted", "dim", "accent", "overdue", "soon", "glitch"]) {
    root.style.setProperty(`--${key}`, p[key]);
  }
  root.style.setProperty("--font", s.font);
  root.style.setProperty("--font-style", s.fontStyle);
  root.style.setProperty("--font-stretch", s.fontStretch);
  root.style.setProperty("--tracking", `${s.tracking}px`);
  root.style.setProperty("--glow", s.glow ? `color-mix(in srgb, ${p.accent} ${Math.round(s.glow * (p.light ? 50 : 100))}%, transparent)` : "transparent");
  Object.assign(root.dataset, { panel: s.panel, header: s.header, bg: s.background, selection: s.selection, accent: s.accent,
                                tag: s.id === "arasaka" || s.id === "pixelquest" ? "filled" : ["sonder", "mochi", "skyglass"].includes(s.id) ? "capsule" : "outline",
                                light: String(p.light) });
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.background);
  FX.paintTextures(root, p);
  FX.setAmbient(state.settings.animatedBackground, s.vibe, p);
}

const unitColour = (code, units) => {
  const p = palette(), i = Math.max(0, units.findIndex((u) => u.code === code));
  return p.units[i % p.units.length];
};

// MARK: Building blocks

function panel(inner, { cls = "", glow = false, emphasis = false, border = "" } = {}) {
  const decos = { brackets: emphasis ? "brackets" : "", topTab: "topTab", chromatic: "chromatic", sparkles: "sparkles",
                  masthead: "masthead", vines: "vines", gloss: "gloss" };
  const deco = decos[skin().accent];
  const content = deco === "sparkles" ? "✦" : deco === "vines" ? "❦" : "";
  return `<section class="panel ${cls} ${glow ? "glow" : ""}" ${border ? `style="--panel-border:${border}"` : ""}>
    ${deco ? `<i class="deco ${deco}">${content}</i>` : ""}${inner}</section>`;
}

function header(title, count = null, cls = "") {
  const style = skin().header;
  const mark = { slashes: "//", bar: "", glitch: "//", sparkle: "✦", heart: "♥", rule: "", leaf: "❦", orb: "", cursor: "▶" }[style];
  const countText = count === null ? "" : style === "slashes" ? `[${count}]` : style === "glitch" ? `//${count}` : style === "bar" ? `— ${count}` : style === "rule" ? count : `· ${count}`;
  return `<div class="header ${cls}"><span class="mark">${mark}</span><span class="title decode">${esc(title.toUpperCase())}</span>
    ${style === "rule" ? `<span class="rule"></span>` : ""}${count === null ? "" : `<span class="count">${esc(countText)}</span>`}</div>`;
}

const segbar = (done, total, segments = 24) => {
  const count = total === 0 ? segments : Math.min(segments, Math.max(total, 1));
  const filled = total === 0 ? 0 : Math.round((done / total) * count);
  return `<div class="segbar" role="img" aria-label="${done} of ${total} done">${Array.from({ length: count }, (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`).join("")}</div>`;
};

function taskRow(task, units) {
  const done = D.isDone(task), state_ = D.dueState(task), [when, ...rest] = D.dueLabel(task).split(" · ");
  const open = expanded.has(task.id);
  return `<div class="task ${done ? "done" : ""}" data-task="${esc(task.id)}">
    <button class="check" data-action="tick" aria-label="${done ? "Mark not done" : "Mark done"}: ${esc(task.title)}"></button>
    <div class="body">
      <div class="title" data-action="expand">${esc(task.title)}</div>
      <div class="meta"><span class="tag" style="--tc:${unitColour(task.unit, units)}">${esc(task.unit)}</span>
        ${task.mine && state.source === "github" ? `<span class="tag" style="--tc:var(--muted)">MINE</span>` : ""}
        ${task.edited ? `<span class="tag" style="--tc:var(--muted)">EDITED</span>` : ""}
        <span class="section">${esc(task.section)}</span></div>
      ${open ? `${task.notes ? `<div class="notes">${esc(task.notes)}</div>` : ""}
        <div class="actions"><button class="btn quiet" data-action="edit-task">Edit</button></div>
        <div class="id">${esc(task.id)}</div>` : ""}
    </div>
    <div class="due label ${state_}">${state_ === "overdue" ? "▲ " : ""}${esc(when.toUpperCase())}${rest.length ? `<small>${esc(rest.join(" · ").toUpperCase())}</small>` : ""}</div>
  </div>`;
}

function taskPanel(title, tasks, units, { count = null, cls = "", glow = false, border = "", empty = words().empty } = {}) {
  return panel(`<div class="panel-head">${header(title, count, cls)}</div>
    ${tasks.length ? tasks.map((t) => taskRow(t, units)).join("") : `<div class="empty label">${esc(empty)}</div>`}`, { glow, border, emphasis: glow });
}

// MARK: Screens

function weekScreen({ units, tasks }) {
  const days = D.thisWeek(), today = D.todayISO();
  const overdue = tasks.filter((t) => t.due && t.due < today && !D.isDone(t));
  const week = tasks.filter((t) => t.due && t.due >= days[0] && t.due <= days[6]);
  const doneCount = week.filter(D.isDone).length;
  const [, , dd] = today.split("-");
  const hero = panel(`<div class="hero">
    <div class="top"><div class="bigdate">${esc(D.dayLabel(today).toUpperCase())}</div>
      <div class="week label">WEEK OF ${esc(D.dayLabel(days[0]).toUpperCase().slice(4))}<small>LON ${D.londonTime()}</small></div></div>
    <div class="stats"><div><div class="stat">${week.length}</div><div class="statlabel label">${esc(skin().prefix)}DUE</div></div>
      <div><div class="stat">${doneCount}</div><div class="statlabel label">${esc(skin().prefix)}DONE</div></div>
      <div><div class="stat ${overdue.length ? "late" : ""}">${overdue.length}</div><div class="statlabel label">${esc(skin().prefix)}LATE</div></div></div>
    <div class="progress label">${segbar(doneCount, week.length)}<span>${week.length ? Math.round((doneCount / week.length) * 100) : 0}%</span></div>
  </div>`, { emphasis: true });
  const blocks = days.map((day) => {
    const list = tasks.filter((t) => t.due === day);
    const isToday = day === today;
    return taskPanel(`${isToday ? "Today · " + D.dayLabel(day).slice(4) : D.dayLabel(day)}`, list, units,
      { count: `${list.filter(D.isDone).length}/${list.length}`, cls: isToday ? "today" : "", glow: isToday, border: isToday ? "var(--accent)" : "" });
  });
  void dd;
  return hero + (overdue.length ? taskPanel("Overdue", overdue, units, { count: overdue.length, cls: "overdue", border: "var(--overdue)" }) : "") + blocks.join("");
}

function tasksScreen({ units, tasks }) {
  const today = D.todayISO();
  const cards = [{ code: "all", name: "All" }, ...units].map((u) => {
    const list = u.code === "all" ? tasks : tasks.filter((t) => t.unit === u.code);
    const done = list.filter(D.isDone).length;
    const days = u.final ? D.dayNumber(u.final) - D.dayNumber(today) : null;
    const info = u.code === "all" ? `${done}/${list.length} · ${units.length} UNITS` : `${done}/${list.length}${days !== null ? ` · FINAL IN ${days} DAYS` : ""}`;
    return `<button class="unitcard label ${filters.unit === u.code ? "selected" : ""}" data-action="filter-unit" data-unit="${esc(u.code)}" style="--uc:${u.code === "all" ? "var(--text)" : unitColour(u.code, units)}">
      ${panel(`<div style="padding:10px 12px"><div class="code"><i></i>${esc(u.code === "all" ? "ALL" : u.code)}</div><div class="info">${esc(info)}</div></div>`, { border: filters.unit === u.code ? "var(--accent)" : "" })}</button>`;
  }).join("");
  const q = filters.search.trim().toLowerCase();
  let list = tasks.filter((t) => filters.unit === "all" || t.unit === filters.unit)
    .filter((t) => !q || [t.title, t.notes, t.id, t.unit, t.section].some((f) => (f ?? "").toLowerCase().includes(q)));
  list = list.filter((t) => filters.status === "all" ? true : filters.status === "done" ? D.isDone(t)
    : filters.status === "overdue" ? t.due && t.due < today && !D.isDone(t) : !D.isDone(t));
  const groups = new Map();
  for (const t of list) {
    const key = t.due ? t.due.slice(0, 7) : "none";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const sections = [...groups.entries()].map(([key, items]) =>
    taskPanel(key === "none" ? "No date" : D.monthLabel(`${key}-01`), items, units, { count: items.length }));
  const status = ["todo", "all", "done", "overdue"].map((s) =>
    `<button class="${filters.status === s ? "on" : ""}" data-action="filter-status" data-status="${s}">${{ todo: "To do", all: "All", done: "Done", overdue: "Late" }[s]}</button>`).join("");
  return `<div class="filters">${cards}</div>
    <div class="toolbar"><input type="search" placeholder="Search title, notes, id, unit, section" value="${esc(filters.search)}" data-input="search" aria-label="Search tasks">
      <div class="segmented">${status}</div><button class="btn primary" data-action="add-task" ${units.length ? "" : "disabled"}>+ Add task</button></div>
    ${sections.join("") || panel(`<div class="empty label">${esc(words().empty)}</div>`)}`;
}

function gradesScreen({ units, tasks }) {
  if (!units.length) return panel(`<div class="empty label">${esc(words().empty)}</div>`);
  return units.map((u) => {
    const g = D.grades(u, tasks);
    const rows = g.items.map((i) => `<tr><td>${esc(i.task.title)}</td><td class="label">${i.weight.toFixed(i.weight % 1 ? 1 : 0)}%</td>
      <td><input type="number" min="0" max="100" step="0.5" value="${state.marks[i.task.id] ?? ""}" data-mark="${esc(i.task.id)}" aria-label="Mark for ${esc(i.task.title)}"></td></tr>`).join("");
    const pct = (n) => `${n.toFixed(1)}%`;
    return panel(`<div class="panel-head">${header(`${u.code} · ${u.name}`, g.items.length)}</div>
      <div class="grades"><div class="summary label">
        <div>Secured<b>${pct(g.secured)}</b></div><div>Average so far<b>${g.average === null ? "—" : pct(g.average)}</b></div>
        <div>Best possible<b>${pct(g.maxPossible)}</b></div>
        <div>Class now<b>${g.average === null ? "—" : D.classLabel(g.average)}</b></div></div>
        <div class="summary label">${[["1ST", 70], ["2:1", 60], ["2:2", 50], ["3RD", 40]].map(([l, t]) => `<div>${l}<b style="font-size:13px">${esc(g.target(t).toUpperCase())}</b></div>`).join("")}</div>
        ${g.items.length && Math.abs(g.weightTotal - 100) > 0.5 ? `<div class="warn">⚠ Weights add up to ${g.weightTotal.toFixed(0)}%, not 100%. Targets assume the unit totals 100%.</div>` : ""}
        ${g.items.length ? `<table><tr><th>Task</th><th>Weight</th><th>Mark</th></tr>${rows}</table>`
          : `<div class="empty">No weighted tasks yet. Put a % in a task's title, e.g. "Coursework 1 (40%)", or in its section, e.g. "Labs (30%)".</div>`}
      </div>`);
  }).join("");
}

function settingsScreen({ units, tasks }) {
  const s = skin(), local = state.source === "local";
  const source = panel(`<div class="panel-head">${header("Data source")}</div>
    <div class="settings-row"><div style="display:flex;gap:8px">
      <button class="btn ${local ? "primary" : "quiet"}" data-action="use-local">💻 This device only</button>
      <button class="btn ${!local ? "primary" : "quiet"}" data-action="use-github">⑂ GitHub</button></div></div>
    <div class="note">${local ? "Your units and tasks are saved in this browser. Back them up below now and then."
      : "Units come from tracker/tasks.json in your GitHub repos (read-only). Tasks you add yourself are saved in this browser."}</div>`);
  const unitsPanel = local ? panel(`<div class="panel-head">${header("Units", state.units.length)}</div>
    ${state.units.map((u) => {
      const n = state.tasks.filter((t) => t.unit === u.code).length;
      return `<div class="settings-row"><div><span class="tag" style="--tc:${unitColour(u.code, units)}">${esc(u.code)}</span> ${esc(u.name)}
        <div class="small" style="font-size:10px;color:var(--dim);margin-top:4px">${n} TASK${n === 1 ? "" : "S"}${u.final ? ` · FINAL ${esc(D.dayLabel(u.final).toUpperCase())}` : ""}</div></div>
        <div style="display:flex;gap:8px"><button class="btn quiet" data-action="copy-unit" data-unit="${esc(u.code)}">Copy tasks.json</button>
        <button class="btn" data-action="edit-unit" data-unit="${esc(u.code)}">Edit</button></div></div>`;
    }).join("")}
    <div class="settings-row"><button class="btn primary" data-action="add-unit">+ Add unit</button></div>`) : "";
  const github = !local ? panel(`<div class="panel-head">${header("GitHub")}</div>
    <div class="settings-row"><span>Token</span><span class="label" style="font-size:11px;color:var(--muted)">🔒 SAVED IN THIS BROWSER</span></div>
    <div class="settings-row"><span>Last updated</span><span class="label" style="font-size:11px;color:var(--muted)">${state.github.lastUpdated ? esc(D.dayLabel(D.todayISO(new Date(state.github.lastUpdated))).toUpperCase() + ", " + D.londonTime(new Date(state.github.lastUpdated))) : "NEVER"}</span></div>
    <div class="settings-row"><div style="display:flex;gap:8px"><button class="btn" data-action="github-guide-token">Replace token</button>
      <button class="btn quiet" data-action="remove-token">Remove token</button><button class="btn quiet" data-action="github-guide-unit">Add a unit on GitHub</button></div></div>`) : "";
  const skinCards = SKINS.map((k) => {
    const p = k.palettes.find((x) => x.id === state.palettes[k.id]) ?? k.palettes[0];
    return `<button class="card ${k.id === s.id ? "selected" : ""}" data-action="skin" data-skin="${k.id}">${panel(`<div style="padding:12px">
      <div class="preview" style="background:${p.background};color:${p.text};border:1px solid ${p.border};font-family:${k.font.replaceAll('"', "'")};font-style:${k.fontStyle}">
        <div class="pw">${k.symbol ? `<span style="color:${p.accent}">${k.symbol}</span> ` : ""}${esc(k.wordmark)}</div>
        <div class="pl" style="color:${p.accent}">${esc(k.prefix)}TODAY · ${esc(D.dayLabel(D.todayISO()).toUpperCase().slice(4))}</div>
        <div class="bars">${p.units.map((c) => `<i style="background:${c}"></i>`).join("")}</div></div>
      <div class="name">${esc(k.name)}${k.id === s.id ? `<span class="active">● ACTIVE</span>` : ""}</div>
      <div class="tagline">${esc(k.tagline)}</div><div class="pack">SOUNDS · ${esc(PACK_NAMES[k.sounds].toUpperCase())}</div></div>`, { border: k.id === s.id ? "var(--accent)" : "" })}</button>`;
  }).join("");
  const themeCards = s.palettes.map((p) => `<button class="card ${p.id === palette().id ? "selected" : ""}" data-action="palette" data-palette="${p.id}">
    ${panel(`<div style="padding:12px"><div class="preview" style="background:${p.background};color:${p.text};border:1px solid ${p.border}">
      <div class="pw" style="display:flex;justify-content:space-between">UnitHub <span style="color:${p.soon}">DUE 2D · <span style="color:${p.overdue}">LATE</span></span></div>
      <div class="bars" style="margin-top:8px">${p.units.map((c) => `<i style="background:${c}"></i>`).join("")}</div></div>
      <div class="name">${esc(p.name)}${p.id === palette().id ? `<span class="active">● ACTIVE</span>` : ""}</div>
      <div class="tagline">${esc(p.tagline)}${p.light ? " · ☀︎ light" : ""}</div></div>`, { border: p.id === palette().id ? "var(--accent)" : "" })}</button>`).join("");
  const toggle = (key, label, detail) => `<label class="switch"><span>${label}<div class="detail">${detail}</div></span>
    <input type="checkbox" data-setting="${key}" ${state.settings[key] ? "checked" : ""}></label>`;
  const system = panel(`<div class="panel-head">${header("System")}</div>
    ${toggle("sounds", "Sounds", PACK_NAMES[s.sounds].toUpperCase() + " PACK")}
    ${toggle("effects", "Skin effects", "TRANSITIONS · DECODE · TICKS · LOGO")}
    ${toggle("boot", "Boot screen", "WHEN THE APP OPENS")}
    ${toggle("animatedBackground", "Animated background", "USES MORE POWER")}
    ${toggle("reminders", "Reminders", "DUE TODAY / TOMORROW, WHILE THE APP IS OPEN")}
    ${installPrompt ? `<div class="settings-row"><span>Install UnitHub as an app</span><button class="btn primary" data-action="install">Install</button></div>` : ""}`);
  const backup = panel(`<div class="panel-head">${header("Backup")}</div>
    <div class="note">Your tasks, ticks, marks and XP live in this browser only. Save a backup file now and then (the GitHub token is never included).</div>
    <div class="settings-row"><div style="display:flex;gap:8px"><button class="btn" data-action="backup">Save backup</button>
      <button class="btn quiet" data-action="restore">Restore from file</button></div></div>`);
  const about = panel(`<div class="panel-head">${header("About")}</div><div class="about"><img src="icons/icon-192.png" alt="">
    <div><b>UnitHub ${VERSION}</b><div class="made">MADE BY MICHAL · MICHAL TECH</div><small>© 2026 Michal Tech. Your tasks stay in your browser and your own GitHub repos.</small></div></div>`);
  void tasks;
  return source + unitsPanel + github + panel(`<div class="panel-head">${header("Skin", SKINS.length)}</div><div class="cards">${skinCards}</div>`)
    + panel(`<div class="panel-head">${header("Theme", s.palettes.length)}</div><div class="cards">${themeCards}</div>`) + system + backup + about;
}

// MARK: Shell

const SCREENS = [
  { id: "week", title: "This week", path: "THIS_WEEK", icon: "▦" },
  { id: "tasks", title: "All tasks", path: "ALL_TASKS", icon: "☰" },
  { id: "grades", title: "Grades", path: "GRADES", icon: "🎓" },
  { id: "settings", title: "Settings", path: "SETTINGS", icon: "⚙" },
];

function render({ animate = false } = {}) {
  if (!state.source || (state.source === "github" && !state.github.token)) return renderSetup();
  const s = skin(), data = D.snapshot(), xp = D.totalXP(), rank = D.rankFor(xp);
  const current = SCREENS.find((x) => x.id === screen);
  const body = { week: weekScreen, tasks: tasksScreen, grades: gradesScreen, settings: settingsScreen }[screen](data);
  const open = data.tasks.filter((t) => !D.isDone(t)).length;
  const late = data.tasks.filter((t) => t.due && t.due < D.todayISO() && !D.isDone(t)).length;
  const threat = D.threat(data.tasks);
  const glitchy = !s.symbol;
  const title = glitchy ? esc(s.wordmark).replace("//", `<span class="slash">//</span>`) : `<span class="symbol">${s.symbol}</span>${esc(s.wordmark)}`;
  const progress = rank.next ? (xp - rank.min) / (rank.next - rank.min) : 1;
  app.innerHTML = `<div class="backdrop"></div><div class="app">
    <aside class="sidebar">
      <div class="wordmark ${glitchy ? "glitchy" : ""}"><div class="title">${title}</div><div class="sub">${esc(s.subtitle)}${glitchy ? ` · V${VERSION}` : ""}</div></div>
      <nav class="nav">${SCREENS.map((x, i) => `<button class="${x.id === screen ? "selected" : ""}" data-action="nav" data-screen="${x.id}" aria-current="${x.id === screen ? "page" : "false"}">
        <span class="num">${String(i + 1).padStart(2, "0")}</span><span class="icon">${x.icon}</span>${esc(x.title.toUpperCase())}</button>`).join("")}</nav>
      <div class="grow"></div>
      <div class="rank label"><div class="lv">${esc(s.prefix)}RANK · LV ${rank.level}</div><div class="name decode">${esc(words().ranks[rank.index])}</div>
        ${segbar(Math.round(progress * 100), 100, 14)}<div class="xp">${rank.next ? `${xp} / ${rank.next} XP` : `${xp} XP · MAX RANK`}</div></div>
      <div class="syncline label"><span class="dot"></span>${state.source === "local" ? "LOCAL · THIS DEVICE" : esc(syncStatus || (state.github.lastUpdated ? `SYNC OK · ${D.londonTime(new Date(state.github.lastUpdated))}` : "NOT SYNCED"))}</div>
    </aside>
    <main class="main">
      <div class="topbar"><span class="crumb">${esc(s.breadcrumb)}</span><span class="arrow">${esc(s.arrow)}</span>
        <span class="decode">${esc(s.soft ? current.title.toUpperCase() : current.path)}</span><span class="spacer"></span>
        <button class="btn quiet" data-action="add-task" ${data.units.length ? "" : "disabled"}>+ Add task</button>
        ${state.source === "github" ? `<button class="btn" data-action="refresh">↻ Refresh</button>` : ""}</div>
      <div class="content"><div class="inner" id="screen">${body}</div></div>
      <div class="statusbar"><span class="k">UNITS</span><span class="v">${data.units.length}</span><span class="sep">│</span>
        <span class="k">OPEN</span><span class="v">${open}</span><span class="sep">│</span>
        <span class="k">LATE</span><span class="v" style="${late ? "color:var(--overdue)" : ""}">${late}</span><span class="sep">│</span>
        <span class="k">${esc(words().threat)}</span><span class="v" style="color:${threat === "CRITICAL" ? "var(--overdue)" : threat === "ELEVATED" ? "var(--soon)" : "var(--muted)"}">${threat}</span>
        <span class="spacer"></span><span class="wide k">SKIN</span><span class="wide v">${esc(s.name.toUpperCase())}</span><span class="wide sep">│</span>
        <span class="wide k">THEME</span><span class="wide v">${esc(palette().name.toUpperCase())}</span><span class="sep">│</span>
        <span class="studio" title="Made by Michal">MICHAL TECH</span></div>
    </main></div>`;
  if (effectsOn()) app.querySelectorAll(".decode").forEach((el) => FX.decode(el, vibe()));
  if (animate && effectsOn()) FX.screenChange(document.getElementById("screen"), vibe());
}

// MARK: First run and GitHub walkthrough

function renderSetup() {
  if (state.source === "github") {
    app.innerHTML = `<div class="backdrop"></div><div class="center">${panel(`<div class="welcome">${header("GitHub")}
      <h1>Connect GitHub</h1><p style="color:var(--muted)">Your token is missing or GitHub rejected it. Make a new read-only token and paste it in.</p>
      <div style="display:flex;gap:8px;margin-top:16px"><button class="btn primary" data-action="github-guide-token">Paste a token</button>
      <button class="btn quiet" data-action="setup-back">Back to start</button></div></div>`, { emphasis: true })}</div>`;
    return;
  }
  app.innerHTML = `<div class="backdrop"></div><div class="center">${panel(`<div class="welcome">
    ${header("Welcome")}<h1 class="decode">Welcome to UnitHub</h1><div class="made">MADE BY MICHAL · MICHAL TECH</div>
    <p style="color:var(--muted)">Your study planner: deadlines, grades, ranks and reminders. Where should your units come from?</p>
    <div class="choices">
      ${panel(`<div class="choice"><div class="big">💻</div><h2>On this device</h2><p>No account needed.</p><p>Add your units and tasks in the app.</p>
        <p>Everything stays in this browser.</p><button class="btn primary" data-action="start-local">Start here</button></div>`, { border: "var(--accent)" })}
      ${panel(`<div class="choice"><div class="big">⑂</div><h2>From GitHub</h2><p>Each unit's tasks live in a tasks.json in your own repo.</p>
        <p>UnitHub only reads them and keeps itself up to date.</p><button class="btn" data-action="github-guide">Set up GitHub</button></div>`)}
    </div><p class="label" style="font-size:10px;color:var(--dim)">⇆ YOU CAN SWITCH ANY TIME IN SETTINGS · PICK A SKIN THERE TOO</p></div>`, { emphasis: true })}</div>`;
  if (effectsOn()) app.querySelectorAll(".decode").forEach((el) => FX.decode(el, vibe()));
}

function dialog(html, onSetup) {
  const d = document.createElement("dialog");
  d.innerHTML = panel(html, { emphasis: true });
  document.body.append(d);
  d.addEventListener("close", () => d.remove());
  d.showModal();
  onSetup?.(d);
  return d;
}

function openGitHubGuide(start = "intro", includeToken = true) {
  const steps = includeToken ? ["intro", "repo", "file", "token"] : ["repo", "file"];
  let step = start, username = localStorage.getItem("unithub.githubUser") || "", code = "", name = "", repo = "";
  const titles = { intro: "How it works", repo: "Make a repo", file: "Add the tasks file", token: "Connect" };
  const d = dialog(`<div class="panel-head">${header("Set up GitHub")}</div><div class="dialog-body"></div><div class="dialog-foot"></div>`);
  const open = (url, query = {}) => {
    const u = new URL(url);
    for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    window.open(u, "_blank", "noopener");
  };
  const draw = () => {
    const i = steps.indexOf(step);
    const cleanCode = D.cleanCode(code), repoName = repo || cleanCode.toLowerCase(), user = username.trim().replace("@", "");
    const file = D.starterFile(cleanCode || "UNIT", name || "My unit");
    const body = {
      intro: `<b>Your tasks, in your own GitHub</b><ol class="guide"><li>Each unit gets its own private repo, like cmp4266.</li>
        <li>Inside it, tracker/tasks.json lists the unit's tasks and deadlines.</li><li>A read-only token lets UnitHub read those files. It can't change anything.</li></ol>
        <p class="note" style="padding:0">Takes about 5 minutes with a free GitHub account. UnitHub opens each GitHub page for you, already filled in.</p>
        <button class="btn quiet" data-g="signup">Open GitHub (sign up or sign in)</button>`,
      repo: `<b>Make a private repo for one unit</b><div class="row-fields"><label class="field"><span>Your GitHub username</span><input type="text" data-g-in="username" value="${esc(username)}"></label>
        <label class="field"><span>Unit code</span><input type="text" data-g-in="code" placeholder="CMP4266" value="${esc(code)}"></label></div>
        <div class="row-fields"><label class="field"><span>Unit name</span><input type="text" data-g-in="name" placeholder="Computer Programming" value="${esc(name)}"></label>
        <label class="field"><span>Repo name</span><input type="text" data-g-in="repo" placeholder="${esc(cleanCode.toLowerCase() || "cmp4266")}" value="${esc(repo)}"></label></div>
        <button class="btn primary" data-g="newrepo" ${cleanCode ? "" : "disabled"}>Create the repo on GitHub</button>
        <p class="note" style="padding:0">GitHub opens with the name filled in and Private picked. Click Create repository, then come back and press Next.</p>`,
      file: `<b>Add tracker/tasks.json</b><p class="note" style="padding:0">A starter file with two example sections. Change the tasks on GitHub now or later.</p>
        <pre class="json">${esc(file)}</pre><div style="display:flex;gap:8px"><button class="btn primary" data-g="newfile" ${user && cleanCode ? "" : "disabled"}>Add the file on GitHub</button>
        <button class="btn quiet" data-g="copy">Copy file</button></div>
        <p class="note" style="padding:0">${user && cleanCode ? "GitHub opens a new file with everything filled in. Scroll down and click Commit changes." : "Go back a step and fill in your username and unit code first."}</p>`,
      token: `<b>Make a read-only token</b><ol class="guide"><li>Click Create token. GitHub opens the new token page.</li><li>Name: UnitHub. Expiration: up to a year.</li>
        <li>Repository access: All repositories, or just your unit repos.</li><li>Permissions → Repository permissions → Contents → Read-only.</li>
        <li>Click Generate token, copy it, and paste it below.</li></ol><button class="btn quiet" data-g="token">Create token on GitHub</button>
        <label class="field"><span>Token</span><input type="password" data-g-in="token" placeholder="Paste token" autocomplete="off"></label>
        <p class="label" style="font-size:10px;color:var(--dim);margin:0">🔒 SAVED ONLY IN THIS BROWSER. ANYONE USING THIS BROWSER PROFILE COULD READ IT.</p>`,
    }[step];
    d.querySelector(".dialog-body").innerHTML = `<div class="steps">${steps.map((s, n) => `<span class="${n <= i ? "on" : ""}">${n < i ? "✓" : n + 1} ${titles[s]}</span>`).join("")}</div>${body}`;
    d.querySelector(".dialog-foot").innerHTML = `<button class="btn quiet" data-g="back">${i > 0 ? "Back" : "Close"}</button><span class="spacer"></span>
      ${step === "token" ? `<button class="btn primary" data-g="save">Save token</button>` : i < steps.length - 1 ? `<button class="btn primary" data-g="next">Next</button>` : `<button class="btn primary" data-g="done">Done</button>`}`;
    d.querySelectorAll("[data-g-in]").forEach((input) => input.addEventListener("input", () => {
      ({ username: () => { username = input.value; localStorage.setItem("unithub.githubUser", username); }, code: () => (code = input.value),
         name: () => (name = input.value), repo: () => (repo = input.value), token: () => {} })[input.dataset.gIn]();
      if (input.dataset.gIn !== "token") d.querySelectorAll("[data-g='newrepo'],[data-g='newfile']").forEach((b) => { b.disabled = !D.cleanCode(code) || (b.dataset.g === "newfile" && !username.trim()); });
    }));
    d.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", async () => {
      switch (b.dataset.g) {
        case "signup": open("https://github.com/signup"); break;
        case "newrepo": open("https://github.com/new", { name: repoName, description: `${cleanCode} ${name} · UnitHub tracker`, visibility: "private" }); break;
        case "newfile": open(`https://github.com/${user}/${repoName}/new/main`, { filename: "tracker/tasks.json", value: file }); break;
        case "copy": await navigator.clipboard.writeText(file); b.textContent = "Copied"; break;
        case "token": open("https://github.com/settings/personal-access-tokens/new", { name: "UnitHub", description: "Read-only: lets UnitHub read tracker/tasks.json" }); break;
        case "back": if (i > 0) { step = steps[i - 1]; draw(); } else d.close(); break;
        case "next": step = steps[i + 1]; draw(); break;
        case "done": d.close(); refresh(); break;
        case "save": {
          const token = d.querySelector("[data-g-in='token']").value.trim();
          if (!token) return;
          state.github.token = token;
          state.source = "github";
          save();
          b.textContent = "Checking…";
          const result = await D.refreshGitHub();
          if (result === "rejected") { state.github.token = ""; save(); toast("GitHub rejected that token. Make a new one and paste it again."); b.textContent = "Save token"; return; }
          d.close();
          render();
          toast(result === "ok" ? `Connected. Found ${D.snapshot().units.length} unit(s).` : "Saved. GitHub couldn't be reached right now; trying again later.");
        }
      }
    }));
  };
  step = steps.includes(start) ? start : steps[0];
  draw();
}

// MARK: Dialogs: tasks and units

function openTaskEditor(task = null) {
  const { units } = D.snapshot();
  const own = !task || task.mine;
  const d = dialog(`<div class="panel-head">${header(task ? "Edit task" : "Add a task", task ? task.unit : null)}</div>
    <form class="dialog-body" method="dialog">
      ${task ? "" : `<label class="field"><span>Unit</span><select name="unit">${units.map((u) => `<option value="${esc(u.code)}" ${filters.unit === u.code ? "selected" : ""}>${esc(u.code)} · ${esc(u.name)}</option>`).join("")}</select></label>`}
      <div class="row-fields"><label class="field" style="flex:2"><span>Title</span><input type="text" name="title" required value="${esc(task?.title ?? "")}" placeholder="e.g. Revise logic gates for Quiz B"></label>
        ${own ? `<label class="field"><span>Section (optional)</span><input type="text" name="section" value="${esc(task?.section && task.section !== "My tasks" ? task.section : "")}" placeholder="Coursework (50%)"></label>` : ""}</div>
      <div class="row-fields"><label class="field"><span>Due (optional)</span><input type="date" name="due" value="${esc(task?.due ?? D.todayISO())}"></label>
        <label class="field"><span>Time (optional)</span><input type="text" name="time" value="${esc(task?.time ?? "")}" placeholder="3 pm, midnight"></label></div>
      <label class="field"><span>Notes</span><textarea name="notes">${esc(task?.notes ?? "")}</textarea></label>
      <p class="label" style="font-size:10px;color:var(--dim);margin:0">🔒 ${state.source === "local" ? "SAVED IN THIS BROWSER. A % IN THE TITLE OR SECTION COUNTS FOR GRADES." : "SAVED IN THIS BROWSER ONLY. THE TASKS.JSON ON GITHUB ISN'T CHANGED."}</p>
    </form>
    <div class="dialog-foot">${task?.mine ? `<button class="btn danger" data-d="delete">Delete task</button>` : task?.edited ? `<button class="btn quiet" data-d="reset">Reset to file</button>` : ""}
      <span class="spacer"></span><button class="btn quiet" data-d="cancel">Cancel</button><button class="btn primary" data-d="save">${task ? "Save" : "Add task"}</button></div>`);
  const form = d.querySelector("form");
  d.querySelector("[data-d='cancel']").onclick = () => d.close();
  d.querySelector("[data-d='delete']")?.addEventListener("click", () => { D.deleteTask(task); d.close(); render(); });
  d.querySelector("[data-d='reset']")?.addEventListener("click", () => { D.resetTask(task); d.close(); render(); });
  d.querySelector("[data-d='save']").onclick = () => {
    const f = Object.fromEntries(new FormData(form));
    if (!f.title?.trim()) { form.title.focus(); return; }
    const fields = { title: f.title.trim(), due: f.due || null, time: f.time?.trim() || null, notes: f.notes ?? "", ...(own ? { section: f.section?.trim() ?? "" } : {}) };
    task ? D.saveTask(task, fields) : D.addTask({ ...fields, unit: f.unit });
    d.close();
    render();
  };
}

function openUnitEditor(unit = null, onSave = () => {}) {
  const d = dialog(`<div class="panel-head">${header(unit ? "Edit unit" : "Add a unit", unit?.code ?? null)}</div>
    <form class="dialog-body" method="dialog">
      <div class="row-fields"><label class="field"><span>Unit code</span><input type="text" name="code" required value="${esc(unit?.code ?? "")}" ${unit ? "disabled" : ""} placeholder="CMP4266"></label>
        <label class="field" style="flex:2"><span>Name</span><input type="text" name="name" required value="${esc(unit?.name ?? "")}" placeholder="Computer Programming"></label></div>
      <div class="row-fields"><label class="field"><span>Final deadline (optional)</span><input type="date" name="final" value="${esc(unit?.final ?? "")}"></label>
        <label class="field"><span>What it is</span><input type="text" name="finalLabel" value="${esc(unit?.finalLabel ?? "")}" placeholder="Final exam, portfolio…"></label>
        <label class="field"><span>Time</span><input type="text" name="finalTime" value="${esc(unit?.finalTime ?? "")}" placeholder="3 pm"></label></div>
      <p class="note" style="padding:0">Add the unit's tasks afterwards with "+ Add task".</p><p class="error" style="color:var(--overdue);margin:0"></p>
    </form>
    <div class="dialog-foot">${unit ? `<button class="btn danger" data-d="delete">Delete unit</button>` : ""}<span class="spacer"></span>
      <button class="btn quiet" data-d="cancel">Cancel</button><button class="btn primary" data-d="save">${unit ? "Save" : "Add unit"}</button></div>`);
  const form = d.querySelector("form");
  d.querySelector("[data-d='cancel']").onclick = () => d.close();
  d.querySelector("[data-d='delete']")?.addEventListener("click", () => {
    if (confirm(`Delete ${unit.code} and all its tasks? This can't be undone.`)) { D.deleteUnit(unit.code); d.close(); render(); }
  });
  d.querySelector("[data-d='save']").onclick = () => {
    const f = Object.fromEntries(new FormData(form));
    const fields = { code: unit?.code ?? f.code ?? "", name: (f.name ?? "").trim(), final: f.final || null,
                     finalLabel: f.final ? (f.finalLabel || "").trim() || null : null, finalTime: f.final ? (f.finalTime || "").trim() || null : null };
    if (!fields.name || !D.cleanCode(fields.code)) { d.querySelector(".error").textContent = "Fill in the unit code and name."; return; }
    if (unit) D.updateUnit(fields);
    else if (!D.addUnit(fields)) { d.querySelector(".error").textContent = `You already have a unit called ${D.cleanCode(fields.code)}.`; return; }
    d.close();
    onSave();
    render();
  };
}

function toast(text) {
  const el = document.createElement("div");
  el.innerHTML = panel(`<div class="toast-inner" style="padding:10px 18px">${esc(text)}</div>`);
  el.className = "toast";
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

function levelUp(rank) {
  sound("levelUp");
  const el = document.createElement("div");
  el.className = "levelup";
  el.innerHTML = panel(`<div style="padding:20px 40px"><div class="l1">${esc(skin().prefix)}${esc(words().levelUp)}</div>
    <div class="l2">${esc(words().ranks[rank.index])}</div><div class="l1" style="color:var(--text)">RANK ${rank.level} UNLOCKED</div></div>`, { glow: true, emphasis: true });
  document.body.append(el);
  el.onclick = () => el.remove();
  setTimeout(() => el.remove(), 3200);
}

// MARK: Events

app.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const row = target.closest("[data-task]");
  const task = row ? D.snapshot().tasks.find((t) => t.id === row.dataset.task) : null;
  switch (action) {
    case "nav":
      if (target.dataset.screen !== screen) { screen = target.dataset.screen; sound("glitch"); render({ animate: true }); }
      break;
    case "tick": {
      const done = !D.isDone(task);
      const rank = D.setDone(task, done);
      row.classList.toggle("done", done);
      if (done) { sound("tick"); if (effectsOn()) FX.tickEffect(row, vibe()); }
      setTimeout(() => render(), done && effectsOn() ? 900 : 0);
      if (rank) setTimeout(() => levelUp(rank), 300);
      remind();
      break;
    }
    case "expand": expanded.has(task.id) ? expanded.delete(task.id) : expanded.add(task.id); sound("blip"); render(); break;
    case "edit-task": openTaskEditor(task); break;
    case "add-task": openTaskEditor(); break;
    case "filter-unit": filters.unit = target.dataset.unit; sound("blip"); render(); break;
    case "filter-status": filters.status = target.dataset.status; sound("blip"); render(); break;
    case "refresh": refresh(true); break;
    case "skin": state.skin = target.dataset.skin; save(); applySkin(); sound("command"); render({ animate: true }); break;
    case "palette": state.palettes[skin().id] = target.dataset.palette; save(); applySkin(); render(); break;
    case "use-local": state.units.length ? (state.source = "local", save(), render()) : openUnitEditor(null, () => { state.source = "local"; save(); }); break;
    case "use-github": state.github.token ? (state.source = "github", save(), render(), refresh(true)) : openGitHubGuide("intro", true); break;
    case "start-local": openUnitEditor(null, () => { state.source = "local"; save(); }); break;
    case "github-guide": openGitHubGuide("intro", true); break;
    case "github-guide-token": openGitHubGuide("token", true); break;
    case "github-guide-unit": openGitHubGuide("repo", false); break;
    case "setup-back": state.source = null; save(); render(); break;
    case "remove-token": if (confirm("Remove the GitHub token from this browser? Your ticks and marks stay.")) { state.github.token = ""; save(); render(); } break;
    case "add-unit": openUnitEditor(); break;
    case "edit-unit": openUnitEditor(state.units.find((u) => u.code === target.dataset.unit)); break;
    case "copy-unit": navigator.clipboard.writeText(D.exportUnitFile(state.units.find((u) => u.code === target.dataset.unit))); target.textContent = "Copied"; break;
    case "backup": {
      const blob = new Blob([D.backupText()], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `unithub-backup-${D.todayISO()}.json` });
      a.click();
      URL.revokeObjectURL(a.href);
      break;
    }
    case "restore": {
      const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
      input.onchange = async () => {
        try { D.restore(await input.files[0].text()); applySkin(); render(); toast("Backup restored."); }
        catch (err) { toast(err.message || "Couldn't read that file."); }
      };
      input.click();
      break;
    }
    case "install": installPrompt?.prompt(); installPrompt = null; break;
  }
});

app.addEventListener("input", (e) => {
  if (e.target.dataset.input === "search") {
    filters.search = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const box = app.querySelector("[data-input='search']");
    box.focus();
    box.setSelectionRange(pos, pos);
  }
});

app.addEventListener("change", (e) => {
  const key = e.target.dataset.setting;
  if (key) {
    state.settings[key] = e.target.checked;
    save();
    if (key === "animatedBackground") applySkin();
    if (key === "reminders" && e.target.checked && "Notification" in window) Notification.requestPermission().then(remind);
    render();
  }
  if (e.target.dataset.mark) {
    const task = D.snapshot().tasks.find((t) => t.id === e.target.dataset.mark);
    D.setMark(task, e.target.value);
    render();
  }
});

// MARK: GitHub refresh, reminders, idle logo moves, boot

async function refresh(manual = false) {
  if (state.source !== "github" || !state.github.token) return;
  syncStatus = "SYNCING…";
  render();
  const result = await D.refreshGitHub();
  syncStatus = { ok: "", rejected: "TOKEN REJECTED", "rate-limited": "RATE LIMITED · SAVED DATA", offline: "OFFLINE · SAVED DATA" }[result];
  if (result === "rejected") { state.github.token = ""; save(); toast("Token rejected, paste a new one."); }
  else if (manual && result !== "ok") toast(syncStatus);
  render();
  remind();
}

/// While the app is open: "Due tomorrow" after 18:00 and "Due today" after 08:00, once per task each.
function remind() {
  if (!state.settings.reminders || !("Notification" in window) || Notification.permission !== "granted") return;
  const sent = JSON.parse(localStorage.getItem("unithub.reminded") || "{}");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(new Date()));
  for (const t of D.snapshot().tasks) {
    if (D.isDone(t) || !t.due) continue;
    const d = D.daysUntil(t);
    const kind = d === 0 && hour >= 8 ? "today" : d === 1 && hour >= 18 ? "tomorrow" : null;
    const key = `${t.id}@${t.due}:${kind}`;
    if (!kind || sent[key]) continue;
    sent[key] = Date.now();
    new Notification(kind === "today" ? "Due today" : "Due tomorrow", { body: `${t.title} · ${t.unit}${t.time ? ` · ${t.time}` : ""}`, icon: "icons/icon-192.png", tag: key });
  }
  localStorage.setItem("unithub.reminded", JSON.stringify(sent));
}

function idleLoop() {
  setTimeout(() => {
    if (effectsOn() && !document.hidden) {
      const mark = app.querySelector(".wordmark"), symbol = app.querySelector(".wordmark .symbol"), v = vibe();
      if (mark?.classList.contains("glitchy")) {
        [0, 120, 240].forEach((t, i) => setTimeout(() => mark.classList.toggle("flicker", i % 2 === 0), t));
        setTimeout(() => mark.classList.remove("flicker"), 320);
      } else if (symbol && v !== "ledger") {
        symbol.classList.add(`idle-${v}`);
        setTimeout(() => symbol.classList.remove(`idle-${v}`), v === "arcane" || v === "aero" ? 1300 : 350);
      }
    }
    idleLoop();
  }, (vibe() === "hijack" ? 2000 + Math.random() * 4000 : 7000 + Math.random() * 7000));
}

function boot() {
  if (!state.settings.boot || FX.reducedMotion() || !state.source || sessionStorage.getItem("unithub.booted")) return;
  sessionStorage.setItem("unithub.booted", "1");
  const s = skin(), data = D.snapshot();
  const line = (label, value) => `${label} ${".".repeat(Math.max(3, 30 - label.length - String(value).length))} ${value}`;
  const lines = [`${s.bootTitle} V${VERSION}`, "MADE BY MICHAL · MICHAL TECH",
                 state.source === "local" ? line("STORAGE", "THIS DEVICE") : line("GITHUB LINK", state.github.token ? "OK" : "NO TOKEN"),
                 line("UNITS ONLINE", data.units.length), line("TASKS LOADED", data.tasks.length),
                 line("OVERDUE", data.tasks.filter((t) => t.due && t.due < D.todayISO() && !D.isDone(t)).length), s.greeting];
  const el = document.createElement("div");
  el.className = "boot";
  const duration = lines.length * 0.17 + 0.45;
  el.innerHTML = `<div class="lines"></div><div class="art"></div><div class="bar" style="--dur:${duration}s"><i></i></div><div class="skip">CLICK OR PRESS ANY KEY TO SKIP</div>`;
  document.body.append(el);
  let step = 0, finished = false;
  const finish = () => { if (finished) return; finished = true; el.style.transition = "opacity .2s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 200); removeEventListener("keydown", finish); };
  el.onclick = finish;
  addEventListener("keydown", finish);
  sound("boot");
  const tick = () => {
    if (finished) return;
    step++;
    el.querySelector(".lines").innerHTML = lines.slice(0, step).map((l) => `<div>${esc(s.prompt + l)}</div>`).join("");
    el.querySelector(".art").innerHTML = FX.bootArt(s.vibe, step, lines.length);
    if (step > 1) sound("print");
    if (step < lines.length) setTimeout(tick, 170); else setTimeout(finish, 1100);
  };
  el.querySelector(".art").innerHTML = FX.bootArt(s.vibe, 0, lines.length);
  setTimeout(tick, 120);
}

// MARK: Start

addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; if (screen === "settings") render(); });
addEventListener("focus", () => { if (Date.now() - new Date(state.github.lastUpdated || 0).getTime() > 30_000) refresh(); });
setInterval(() => refresh(), 10 * 60_000);
setInterval(remind, 5 * 60_000);
// Redraw at midnight (London) so "today" moves on.
let lastDay = D.todayISO();
setInterval(() => { if (D.todayISO() !== lastDay) { lastDay = D.todayISO(); render(); } }, 60_000);

applySkin();
render();
boot();
refresh();
remind();
idleLoop();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
