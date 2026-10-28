# UnitHub for the web

The Windows / any-browser version of the UnitHub Mac app (sibling folder `../UnitHub`). Hosted on GitHub Pages as an installable PWA. Made by Michal · Michal Tech.

- Plain HTML, CSS and ES modules. No build step, no packages, no external requests except the GitHub API.
- `js/data.js`: state in localStorage (`unithub.v1`), London dates, tolerant tasks.json parser, GitHub fetch (read-only, ETags), XP, ranks, grades. Same rules as the Mac app's CLAUDE.md.
- `js/skins.js` + `js/palettes.js`: the 9 skins and 34 palettes, copied from the Mac app. Keep them in sync when the Mac skins change; every text colour must stay ≥ 4.5:1.
- `js/effects.js`: boot art, screen-change and tick effects, decoding headers, textures, animated backgrounds (canvas, paused when hidden). Respect prefers-reduced-motion.
- `js/sound.js`: Web Audio port of Sound.swift (voices, packs, reshape).
- `sw.js`: offline cache. Bump `VERSION` and the file list when files are added or removed.
- Never commit tokens. The GitHub token lives only in the user's browser storage.
