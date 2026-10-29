// Everything UnitHub knows, saved in this browser (localStorage). A port of the Mac app's AppStore, TaskEdits,
// LocalUnits, UnitParser, Ranks and Grades. Units come from GitHub (read-only tracker/tasks.json files) or are
// made in the app ("local"). Nothing is ever written to GitHub.
import { RANK_XP } from "./skins.js";

const KEY = "unithub.v1";

const DEFAULTS = {
  source: null, // "local" | "github" | null (first run)
  units: [], // local units: { code, name, final, finalLabel, finalTime }
  tasks: [], // your own tasks: { id, unit, title, section, due, time, notes }
  edits: {}, // changes to GitHub tasks: "UNIT:id" -> { title, due, time, notes }
  ticks: {}, // "UNIT:id" -> true/false (beats the file's "done")
  marks: {}, // "UNIT:id" -> 0–100
  xp: {}, // "UNIT:id" -> XP earned for ticking it
  skin: "cupertino", // new users start in Cupertino
  palettes: {}, // skin id -> palette id
  settings: { sounds: true, effects: true, boot: true, animatedBackground: false, reminders: false },
  github: { token: "", files: {}, lastUpdated: null }, // files: repo -> { etag, text }
};

export const state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!saved) return structuredClone(DEFAULTS);
    return { ...structuredClone(DEFAULTS), ...saved, settings: { ...DEFAULTS.settings, ...saved.settings },
             github: { ...DEFAULTS.github, ...saved.github } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private windows can refuse storage; the app still works for this visit.
  }
}

// MARK: Backup

/// Everything except the GitHub token, as a file to keep somewhere safe.
export function backupText() {
  const copy = structuredClone(state);
  copy.github.token = "";
  copy.github.files = {};
  return JSON.stringify({ unithubBackup: 1, saved: new Date().toISOString(), data: copy }, null, 2);
}

export function restore(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.unithubBackup !== 1 || !parsed.data) throw new Error("That isn't a UnitHub backup file.");
  const token = state.github.token;
  Object.assign(state, structuredClone(DEFAULTS), parsed.data);
  state.github.token = token;
  save();
}

// MARK: London dates

const LONDON = "Europe/London";
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit" });

/// Today's date in London, "2026-10-28".
export function todayISO(now = new Date()) {
  const parts = Object.fromEntries(dayFmt.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/// Whole days since 1970 for "2026-10-28" (counted in UTC so clock changes never skip a day).
export function dayNumber(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function isoFromDayNumber(n) {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/// "Mon 26 Oct"
export function dayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${d} ${MONTHS[m - 1]}`;
}

export function monthLabel(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function londonTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, hour: "2-digit", minute: "2-digit" }).format(date);
}

/// Monday to Sunday of the week containing today, as ISO days.
export function thisWeek() {
  const today = dayNumber(todayISO());
  const weekday = (new Date(today * 86_400_000).getUTCDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 7 }, (_, i) => isoFromDayNumber(today - weekday + i));
}

// MARK: tasks.json (tolerant: missing or odd fields never crash, unknown ones are ignored)

function str(v) {
  if (typeof v === "string" || typeof v === "number") {
    const t = String(v).trim();
    return t || null;
  }
  return null;
}

function validDay(v) {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function parseTasksFile(text, repo) {
  let root;
  try {
    root = JSON.parse(text);
  } catch {
    return null;
  }
  if (!root || typeof root !== "object" || Array.isArray(root)) return null;
  const repoName = repo.split("/").pop();
  const code = str(root.unit) ?? repoName;
  let name = str(root.name);
  if (!name) {
    const title = str(root.title);
    if (title) {
      name = title.toLowerCase().startsWith(code.toLowerCase())
        ? title.slice(code.length).replace(/^[\s\-–—:·]+/, "") || null : title;
    }
  }
  const final = root.final && typeof root.final === "object" ? root.final : null;
  const unit = { code, name: name ?? code, repo, final: validDay(final?.d), finalLabel: str(final?.label), finalTime: str(final?.tm) };
  const tasks = [];
  for (const section of Array.isArray(root.sections) ? root.sections : []) {
    const sectionName = str(section?.name) ?? str(section?.id) ?? "";
    for (const item of Array.isArray(section?.items) ? section.items : []) {
      const id = str(item?.id), title = str(item?.t);
      if (!id || !title) continue;
      tasks.push({
        id: `${code}:${id}`, unit: code, title, section: sectionName, due: validDay(item.d), time: str(item.tm),
        estimated: item.est === true || str(item.est) === "true", notes: str(item.n) ?? "",
        fileDone: item.done === true || str(item.done) === "true", fromFile: true,
      });
    }
  }
  return { unit, tasks };
}

// MARK: Units and tasks on screen

/// The units and tasks to show: GitHub files (with your edits) or local units, plus your own tasks, soonest first.
export function snapshot() {
  let units = [], tasks = [];
  if (state.source === "github") {
    for (const [repo, file] of Object.entries(state.github.files).sort()) {
      const parsed = parseTasksFile(file.text, repo);
      if (!parsed || units.some((u) => u.code === parsed.unit.code)) continue;
      units.push(parsed.unit);
      tasks.push(...parsed.tasks.map((t) => {
        const edit = state.edits[t.id];
        return edit ? { ...t, ...edit, edited: true } : t;
      }));
    }
  } else {
    units = state.units.map((u) => ({ ...u, repo: "local" }));
  }
  const codes = new Set(units.map((u) => u.code));
  tasks.push(...state.tasks.filter((t) => codes.has(t.unit)).map((t) => ({ ...t, section: t.section || "My tasks", mine: true, fileDone: false })));
  units.sort((a, b) => a.code.localeCompare(b.code));
  tasks = tasks.map((t, i) => [t, i]).sort(([a, ia], [b, ib]) =>
    (a.due ?? "9999") < (b.due ?? "9999") ? -1 : (a.due ?? "9999") > (b.due ?? "9999") ? 1
      : a.unit !== b.unit ? a.unit.localeCompare(b.unit) : ia - ib).map(([t]) => t);
  return { units, tasks };
}

export const isDone = (task) => state.ticks[task.id] ?? task.fileDone ?? false;

export function daysUntil(task) {
  return task.due ? dayNumber(task.due) - dayNumber(todayISO()) : null;
}

/// "Due in 3 days · Sat 31 Oct, midnight (est.)"
export function dueLabel(task) {
  const d = daysUntil(task);
  if (d === null) return "No date";
  const when = d < -1 ? `Overdue by ${-d} days` : d === -1 ? "Overdue by 1 day" : d === 0 ? "Due today"
    : d === 1 ? "Due tomorrow" : `Due in ${d} days`;
  return `${when} · ${dayLabel(task.due)}${task.time ? `, ${task.time}` : ""}${task.estimated ? " (est.)" : ""}`;
}

/// "overdue", "soon" (within 7 days) or "".
export function dueState(task) {
  const d = daysUntil(task);
  if (d === null || isDone(task)) return "";
  return d < 0 ? "overdue" : d <= 7 ? "soon" : "";
}

// MARK: Ticks and XP

export function totalXP() {
  return Object.values(state.xp).reduce((a, b) => a + b, 0);
}

export function rankFor(xp) {
  let level = 0;
  RANK_XP.forEach((min, i) => { if (xp >= min) level = i; });
  return { level: level + 1, index: level, min: RANK_XP[level], next: RANK_XP[level + 1] ?? null };
}

/// Ticks or unticks a task. Returns the new rank if this tick moved you up a rank.
export function setDone(task, done) {
  const before = rankFor(totalXP()).level;
  state.ticks[task.id] = done;
  if (done && state.xp[task.id] === undefined) {
    const d = daysUntil(task);
    state.xp[task.id] = d === null ? 10 : 10 + (d >= 0 ? 15 : 0) + (d >= 2 ? 10 : 0);
  } else if (!done) {
    delete state.xp[task.id];
  }
  save();
  const after = rankFor(totalXP());
  return after.level > before ? after : null;
}

/// overdue × 3 + due within 48 hours: 0 = LOW, 1–3 = ELEVATED, more = CRITICAL.
export function threat(tasks) {
  const open = tasks.filter((t) => !isDone(t));
  const overdue = open.filter((t) => (daysUntil(t) ?? 1) < 0).length;
  const soon = open.filter((t) => { const d = daysUntil(t); return d === 0 || d === 1; }).length;
  const score = overdue * 3 + soon;
  return score === 0 ? "LOW" : score <= 3 ? "ELEVATED" : "CRITICAL";
}

// MARK: Your own tasks and units

export function cleanCode(code) {
  return code.toUpperCase().replace(/[\s:]/g, "");
}

export function addTask(fields) {
  const id = `${fields.unit}:my-${crypto.randomUUID().slice(0, 8)}`;
  state.tasks.push({ id, unit: fields.unit, title: fields.title, section: fields.section || "", due: fields.due || null,
                     time: fields.time || null, notes: fields.notes || "" });
  save();
}

export function saveTask(task, fields) {
  if (task.mine) {
    Object.assign(state.tasks.find((t) => t.id === task.id), fields);
  } else {
    state.edits[task.id] = { title: fields.title, due: fields.due || null, time: fields.time || null, notes: fields.notes || "" };
  }
  save();
}

export function deleteTask(task) {
  state.tasks = state.tasks.filter((t) => t.id !== task.id);
  save();
}

export function resetTask(task) {
  delete state.edits[task.id];
  save();
}

export function addUnit(unit) {
  unit.code = cleanCode(unit.code);
  if (!unit.code || state.units.some((u) => u.code === unit.code)) return false;
  state.units.push(unit);
  save();
  return true;
}

export function updateUnit(unit) {
  const i = state.units.findIndex((u) => u.code === unit.code);
  if (i >= 0) state.units[i] = unit;
  save();
}

export function deleteUnit(code) {
  state.units = state.units.filter((u) => u.code !== code);
  state.tasks = state.tasks.filter((t) => t.unit !== code);
  save();
}

// MARK: Grades (same rules as the Mac app)

export function percentIn(text) {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(text ?? "");
  return m ? Number(m[1]) : null;
}

/// "62.5%" or "70%", like the Mac app.
export function percentText(v) {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? `${r}%` : `${r.toFixed(1)}%`;
}

export function classLabel(p) {
  return p >= 70 ? "1ST" : p >= 60 ? "2:1" : p >= 50 ? "2:2" : p >= 40 ? "3RD" : "FAIL";
}

export function grades(unit, tasks) {
  const unitTasks = tasks.filter((t) => t.unit === unit.code);
  const bySection = {};
  for (const t of unitTasks) (bySection[t.section] ??= []).push(t);
  const items = [];
  for (const t of unitTasks) {
    const own = percentIn(t.title);
    if (own !== null) { items.push({ task: t, weight: own, shared: false }); continue; }
    const siblings = bySection[t.section];
    const sectionWeight = percentIn(t.section);
    if (sectionWeight === null || siblings.some((s) => percentIn(s.title) !== null)) continue;
    items.push({ task: t, weight: sectionWeight / siblings.length, shared: true });
  }
  const weightTotal = items.reduce((a, i) => a + i.weight, 0);
  const marked = items.filter((i) => state.marks[i.task.id] !== undefined);
  const markedWeight = marked.reduce((a, i) => a + i.weight, 0);
  const secured = marked.reduce((a, i) => a + state.marks[i.task.id] * i.weight / 100, 0);
  const remaining = Math.max(0, 100 - markedWeight);
  /// What average the remaining work needs for a class: { secured }, { need: 62.5 } or { out: true }.
  const target = (threshold) => {
    if (secured >= threshold) return { secured: true };
    if (remaining <= 0) return { out: true };
    const need = (threshold - secured) / remaining * 100;
    return need > 100 ? { out: true } : { need };
  };
  return { items, weightTotal, markedWeight, secured, average: markedWeight > 0 ? secured / markedWeight * 100 : null,
           maxPossible: secured + remaining, target };
}

export function setMark(task, value) {
  if (value === null || value === "" || Number.isNaN(Number(value))) delete state.marks[task.id];
  else state.marks[task.id] = Math.min(100, Math.max(0, Number(value)));
  save();
}

// MARK: GitHub (read-only)

const API = "https://api.github.com";

function headers(extra = {}) {
  return { Authorization: `Bearer ${state.github.token}`, Accept: "application/vnd.github+json",
           "X-GitHub-Api-Version": "2022-11-28", ...extra };
}

/// Fetches every repo's tracker/tasks.json. Returns "ok", "rejected", "rate-limited" or "offline".
export async function refreshGitHub() {
  if (state.source !== "github" || !state.github.token) return "ok";
  try {
    const repos = [];
    for (let page = 1; page < 20; page++) {
      const r = await fetch(`${API}/user/repos?per_page=100&affiliation=owner&page=${page}`, { headers: headers() });
      if (r.status === 401) return "rejected";
      if (r.status === 403 || r.status === 429) return "rate-limited";
      if (!r.ok) return "offline";
      const list = await r.json();
      if (!list.length) break;
      repos.push(...list.map((x) => x.full_name));
    }
    const files = { ...state.github.files };
    let limited = false;
    await Promise.all(repos.map(async (repo) => {
      const old = files[repo];
      const r = await fetch(`${API}/repos/${repo}/contents/tracker/tasks.json`, {
        headers: headers({ Accept: "application/vnd.github.raw+json", ...(old?.etag ? { "If-None-Match": old.etag } : {}) }),
      });
      if (r.status === 304) return;
      if (r.status === 404) { delete files[repo]; return; }
      if (r.status === 403 || r.status === 429) { limited = true; return; }
      if (!r.ok) return;
      const text = await r.text();
      // A file that doesn't parse keeps the last good copy.
      if (parseTasksFile(text, repo)) files[repo] = { etag: r.headers.get("ETag"), text };
    }));
    for (const repo of Object.keys(files)) if (!repos.includes(repo)) delete files[repo];
    state.github.files = files;
    state.github.lastUpdated = new Date().toISOString();
    save();
    return limited ? "rate-limited" : "ok";
  } catch {
    return "offline";
  }
}

// MARK: Starter tasks.json (for the GitHub walkthrough and for moving a local unit to GitHub)

export function starterFile(code, name) {
  const today = dayNumber(todayISO());
  const day = (n) => isoFromDayNumber(today + n);
  return JSON.stringify({
    unit: code, name, title: `${code} ${name}`, sub: "Made with UnitHub · Michal Tech", rev: day(0),
    final: { d: day(70), label: "Final assessment", tm: "midnight" },
    sections: [
      { id: "labs", name: "Weekly labs (30%)", note: "Split equally across the labs.", items: [
        { id: "lab1", t: "Lab 1", d: day(7), tm: "midnight", n: "Change me: what to hand in." },
        { id: "lab2", t: "Lab 2", d: day(14), tm: "midnight" } ] },
      { id: "coursework", name: "Coursework", note: "A % in a task's title is its weight.", items: [
        { id: "cw1", t: "Coursework 1 (70%)", d: day(56), tm: "3 pm" } ] },
    ],
  }, null, 2) + "\n";
}

export function exportUnitFile(unit) {
  const sections = [];
  for (const t of state.tasks.filter((t) => t.unit === unit.code)) {
    const name = t.section || "My tasks";
    let s = sections.find((x) => x.name === name);
    if (!s) sections.push(s = { id: name.toLowerCase().replace(/[^a-z0-9]/g, "") || `section${sections.length + 1}`, name, note: "", items: [] });
    s.items.push({ id: t.id.split(":").pop(), t: t.title, ...(t.due ? { d: t.due } : {}), ...(t.time ? { tm: t.time } : {}), ...(t.notes ? { n: t.notes } : {}) });
  }
  return JSON.stringify({ unit: unit.code, name: unit.name, title: `${unit.code} ${unit.name}`, sub: "Exported from UnitHub",
    rev: todayISO(), ...(unit.final ? { final: { d: unit.final, label: unit.finalLabel || "Final deadline", ...(unit.finalTime ? { tm: unit.finalTime } : {}) } } : {}),
    sections }, null, 2) + "\n";
}
