// The ten skins, matching the Mac app's Skins.swift and Vibes.swift. A skin is a whole design: panel shape, type,
// header style, background, sidebar selection, decoration, words, ranks, boot screen and sound pack.
import { PALETTES } from "./palettes.js";

const MONO = 'ui-monospace, "Cascadia Mono", Consolas, "SF Mono", Menlo, monospace';
const SANS = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif';
const SERIF = 'Georgia, Cambria, "Times New Roman", ui-serif, serif';
const APPLE = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';
const ROUNDED = 'ui-rounded, "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif';

export const SKINS = [
  {
    id: "cupertino", name: "Cupertino", tagline: "Clean, calm and polished, in the style of Apple's own apps. Light and dark themes.",
    panel: "card", header: "plain", font: APPLE, fontStyle: "normal", fontStretch: "normal", tracking: 0, soft: true, sentenceCase: true,
    background: "plain", selection: "sourceList", accent: "softShadow", glow: 0, wordmark: "UnitHub", symbol: "✓", appIcon: true,
    subtitle: "Study planner", breadcrumb: "UnitHub", arrow: "›", prompt: "", prefix: "", vibe: "cupertino", sounds: "crisp",
    bootTitle: "UnitHub", greeting: "Welcome back.",
  },
  {
    id: "netrunner", name: "Netrunner", tagline: "Neon HUD, glitches, scanlines. Works with every theme.",
    panel: "chamfer", header: "slashes", font: MONO, fontStyle: "normal", fontStretch: "normal", tracking: 1.5,
    background: "scanlines", selection: "arrowTab", accent: "brackets", glow: 0.35, wordmark: "UNIT//HUB", symbol: null,
    subtitle: "STUDY_OS", breadcrumb: "SYS://UNITHUB", arrow: "▸", prompt: "> ", prefix: "// ", vibe: "terminal", sounds: "netrunner",
    bootTitle: "UNITHUB STUDY_OS // BOOT", greeting: "WELCOME BACK, OPERATOR.",
  },
  {
    id: "arasaka", name: "Arasaka", tagline: "Corporate terminal. Black, blood red, razor edges.",
    panel: "cutCorner", header: "bar", font: SANS, fontStyle: "normal", fontStretch: "condensed", tracking: 2.5,
    background: "grid", selection: "block", accent: "topTab", glow: 0, wordmark: "UNITHUB", symbol: "▮",
    subtitle: "ARASAKA NETWORK · 荒坂", breadcrumb: "ARASAKA//NET", arrow: "›", prompt: "▌ ", prefix: "▌", vibe: "corporate", sounds: "corporate",
    bootTitle: "ARASAKA CORPORATE TERMINAL // UNITHUB", greeting: "IDENTITY CONFIRMED. WELCOME, EMPLOYEE.",
  },
  {
    id: "maelstrom", name: "Maelstrom", tagline: "Gang chrome. Torn edges, red static, toxic glitches.",
    panel: "torn", header: "glitch", font: MONO, fontStyle: "normal", fontStretch: "normal", tracking: 1.5,
    background: "noise", selection: "glitchBlock", accent: "chromatic", glow: 0.45, wordmark: "UNIT//HUB", symbol: null,
    subtitle: "MAELSTROM · ALL CHROME", breadcrumb: "MLSTRM::", arrow: "»", prompt: ">> ", prefix: "//", vibe: "hijack", sounds: "distorted",
    bootTitle: "MAELSTROM BLACKWIRE // UNITHUB // NO RULES", greeting: "SYSTEM HIJACKED. CHROME ONLINE, CHOOM.",
  },
  {
    id: "sonder", name: "Sonder", tagline: "Candlelit tome. Sunflower ink, sparkles and a natural 20. Light and dark themes.",
    panel: "rounded", header: "sparkle", font: SERIF, fontStyle: "normal", fontStretch: "normal", tracking: 0.8, soft: true,
    background: "stars", selection: "inkLoop", accent: "sparkles", glow: 0.3, wordmark: "UnitHub", symbol: "🎲",
    subtitle: "SONDER · NAT 20", breadcrumb: "TOME", arrow: "❧", prompt: "✦ ", prefix: "✦ ", vibe: "arcane", sounds: "bard",
    bootTitle: "SONDER'S SPELLBOOK // UNITHUB", greeting: "NATURAL 20. YOUR QUEST AWAITS, ADVENTURER.",
  },
  {
    id: "mochi", name: "Mochi", tagline: "Soft pastels, bubbly stickers and floating hearts. Stay cute.",
    panel: "bubble", header: "heart", font: ROUNDED, fontStyle: "normal", fontStretch: "normal", tracking: 0.8, soft: true, heavy: true,
    background: "polka", selection: "bubble", accent: "sticker", glow: 0.2, wordmark: "unithub", symbol: "♥",
    subtitle: "MOCHI · STAY CUTE ♡", breadcrumb: "mochi", arrow: "♡", prompt: "♡ ", prefix: "♡ ", vibe: "cute", sounds: "bubbly",
    bootTitle: "MOCHI OS IS WAKING UP", greeting: "HI FRIEND! LET'S DO OUR BEST TODAY ♡",
  },
  {
    id: "ledger", name: "Ledger", tagline: "Quiet, editorial and exact. Ruled paper, sharp lines, no noise.",
    panel: "square", header: "rule", font: SANS, fontStyle: "normal", fontStretch: "normal", tracking: 0.8, soft: true,
    background: "ruled", selection: "marginBar", accent: "masthead", glow: 0, wordmark: "UnitHub", symbol: "▤",
    subtitle: "LEDGER · EST. 2026", breadcrumb: "Ledger", arrow: "/", prompt: "— ", prefix: "", vibe: "ledger", sounds: "minimal",
    bootTitle: "LEDGER — UNITHUB", greeting: "READY. ONE THING AT A TIME.",
  },
  {
    id: "grove", name: "Grove", tagline: "An enchanted forest. Leaves, vines, fae light and a tree that grows.",
    panel: "leaf", header: "leaf", font: SERIF, fontStyle: "italic", fontStretch: "normal", tracking: 0.8, soft: true,
    background: "foliage", selection: "glade", accent: "vines", glow: 0.4, wordmark: "UnitHub", symbol: "🍃",
    subtitle: "THE ELDER GROVE", breadcrumb: "The Grove", arrow: "❦", prompt: "❦ ", prefix: "❦ ", vibe: "grove", sounds: "woodland",
    bootTitle: "THE ELDER GROVE AWAKENS", greeting: "THE TREES REMEMBER YOU. WELCOME HOME.",
  },
  {
    id: "skyglass", name: "Skyglass", tagline: "Glossy Y2K optimism. Glass, sky, bubbles and sunshine.",
    panel: "glass", header: "orb", font: SANS, fontStyle: "normal", fontStretch: "expanded", tracking: 1.6, soft: true,
    background: "sky", selection: "glassPill", accent: "gloss", glow: 0.35, wordmark: "UnitHub", symbol: "🌐",
    subtitle: "SKYGLASS · EST. 2002", breadcrumb: "Skyglass", arrow: "›", prompt: "○ ", prefix: "○ ", vibe: "aero", sounds: "aero",
    bootTitle: "SKYGLASS IS STARTING UP", greeting: "WELCOME! YOUR DAY IS READY ☀︎",
  },
  {
    id: "pixelquest", name: "Pixel Quest", tagline: "An 8-bit handheld RPG. Pixels, chiptune and PRESS START.",
    panel: "pixel", header: "cursor", font: MONO, fontStyle: "normal", fontStretch: "normal", tracking: 1, heavy: true,
    background: "dither", selection: "cursor", accent: "hardShadow", glow: 0, wordmark: "UNITHUB", symbol: "🎮",
    subtitle: "PIXEL QUEST · 1P START", breadcrumb: "WORLD 1", arrow: "▶", prompt: "▶ ", prefix: "▶ ", vibe: "pixel", sounds: "chiptune",
    bootTitle: "PIXEL QUEST — UNITHUB EDITION", greeting: "PRESS START TO CONTINUE YOUR QUEST",
  },
];

for (const skin of SKINS) skin.palettes = PALETTES[skin.id];

/// Each skin's words (Vibes.swift).
export const VIBES = {
  terminal: { empty: "— NOTHING DUE", levelUp: "LEVEL UP", threat: "THREAT", glyphs: "▓▒░#%&@$<>/\\01",
              ranks: ["SCRIPT KIDDIE", "STREET RUNNER", "NETRUNNER", "ICEBREAKER", "GHOST", "CYBER LEGEND"] },
  corporate: { empty: "— NO DIRECTIVES PENDING", levelUp: "PROMOTION APPROVED", threat: "RISK", glyphs: "typeon", stamp: "APPROVED",
               ranks: ["INTERN", "ASSOCIATE", "ANALYST", "MANAGER", "DIRECTOR", "BOARD MEMBER"] },
  hijack: { empty: "— NOTHING TO SMASH", levelUp: "MORE CHROME", threat: "HEAT", glyphs: "¥§¿‡†╳▓░#!?¤",
            ranks: ["GONK", "PUNK", "BOOSTER", "CHROMEHEAD", "ENFORCER", "WARLORD"] },
  arcane: { empty: "— A QUIET DAY AT THE TAVERN", levelUp: "LEVEL UP!", threat: "PERIL", glyphs: "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ",
            ranks: ["PEASANT", "SQUIRE", "ADVENTURER", "HERO", "ARCHMAGE", "LEGEND"] },
  cute: { empty: "— NOTHING DUE, NAP TIME ♡", levelUp: "YOU GREW! ♡", threat: "STRESS", glyphs: "♡☆✿❀♪", stamp: "YAY! ♡",
          ranks: ["SPROUT", "BEAN", "BUN", "DUMPLING", "MOCHI MASTER", "SUPREME SNACK"] },
  ledger: { empty: "— Nothing due.", levelUp: "NEW TITLE", threat: "WORKLOAD", glyphs: null,
            ranks: ["FRESHER", "SCHOLAR", "GRADUATE", "RESEARCHER", "FELLOW", "PROFESSOR"] },
  grove: { empty: "— THE GROVE IS QUIET", levelUp: "THE GROVE GROWS", threat: "OMENS", glyphs: "ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍ",
           ranks: ["SEEDLING", "SPRITE", "RANGER", "DRUID", "ARCHDRUID", "ELDER"] },
  aero: { empty: "— ALL CLEAR! ENJOY THE SUNSHINE ☀︎", levelUp: "UPGRADE COMPLETE!", threat: "FORECAST", glyphs: "○◌◎●◦",
          ranks: ["DIAL-UP", "BROADBAND", "HOTSPOT", "FIBRE OPTIC", "SATELLITE", "CLOUD NINE"] },
  cupertino: { empty: "Nothing due. Enjoy your day.", levelUp: "Level up", threat: "Outlook", glyphs: null,
               ranks: ["Starter", "Explorer", "Achiever", "Pro", "Pro Max", "Ultra"] },
  pixel: { empty: "— NO QUESTS. GO TOUCH GRASS", levelUp: "NEW HIGH SCORE!", threat: "ENEMIES", glyphs: "█▓▒░",
           ranks: ["NPC", "ROOKIE", "HERO", "CHAMPION", "BOSS SLAYER", "FINAL BOSS"] },
};

export const RANK_XP = [0, 100, 300, 700, 1500, 3000];

export function skinById(id) {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
