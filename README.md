# GOBLIN — a tale of growth & shenanigans

A lightweight, **text/ASCII idle game** inspired by *Candy Box 2*. You play a
runt goblin who forages, builds, breeds a tribe, and raids the countryside —
and your **ending is never chosen, it's earned**. Four destinies pull at you
based on hidden stats your actions quietly feed:

- **The Pure Warren** — a kingdom for goblins, and goblins *only* (xenophobic,
  framed as fantasy satire — not endorsement)
- **The Motley Kingdom** — a thriving home for every fantasy race
- **The Endless Road** — never settle; roam and cause glorious chaos
- **The Goblin That Loomed** — become the villain the world fears

You don't pick one. The game tracks **greed / cruelty / openness / wanderlust**
behind the scenes and the story drifts toward whichever you've been feeding —
often a surprise even to the author. Build the **Totem of Tales** to glimpse
your "Destiny" meter; raise the **Great Hall** to end your tale.

### The Silliness Index

Before a run begins, you drag the **Silliness Index** — a 0–100% dial from
*Deadly Serious* to *Utterly Unhinged*. It sets the probability that any given
narrative draw (your opening legend, ambient beats, raid encounters, random
events, chapter heralds, the finale) comes from the **silly/satirical** register
instead of the earnest one. Every line has a parallel silly twin, so the same
turnip farm is either a grim cautionary raid or the founding of a tiny turnip
republic (its flag is a sock). The dial is fixed for the run — start a new tale
to try a different temperament. (See `docs/story-tone-mockup.md` for the full
tonal comparison that inspired it.)

Along the way the world pushes back: **random events** (wandering bards, ragged
refugees, a sleeping wyrm's hoard, a sickness in the tunnels) interrupt with
choices that quietly tilt those same hidden stats. A **Lookout Warren** makes
the nastier surprises rarer; a **Mushroom Brewery** ferments coin while you
sleep. Your deeds are recorded in the **Annals** (achievements), and you can
**bulk-buy** structures (×1 / ×10 / Max) and **export/import** your save as a
portable code.

## Play it

- **No install.** It's pure HTML/CSS/JS — just open `index.html` in a browser
  (double-click it, or run a tiny local server: `python3 -m http.server` then
  visit `http://localhost:8000`).
- **Online:** enable GitHub Pages once (repo **Settings → Pages → Source:
  *GitHub Actions***) and every push to `main` auto-deploys this repo root.
  The game then lives at `https://<your-user>.github.io/GobbieLife/`.

Saves live in your browser (`localStorage`) and the warren keeps working while
you're away (offline progress, capped at 8 hours).

## Privacy & security

GOBLIN is a fully **client-side** game: no backend, no accounts, no analytics,
no network requests of any kind. Your save never leaves your browser. The page
ships a strict **Content-Security-Policy** (same-origin scripts only, no inline
script/event handlers, no outbound connections) as defense-in-depth, and all
displayed text is HTML-escaped. Imported **save codes** are treated as untrusted
input and fully type-coerced/validated before use, so a shared code can't inject
markup or corrupt the game.

## How it works (the "generated without your knowledge" part)

There's no backend and no live AI — that keeps it tiny and free to host. The
narrative is **procedurally assembled** from authored building blocks:

- `js/story.js` — a generative grammar builds your goblin's opening legend, and
  a pool of tagged **beats** is sampled *weighted by your current dominant
  stat*, so the Chronicle bends toward your emergent destiny.
- Every playthrough reads differently; even knowing the parts, you can't
  predict the whole.

## Project layout

| File | Role |
|------|------|
| `index.html` | shell + panels |
| `css/style.css` | mossy-cave terminal theme |
| `js/data.js` | resources, buildings, jobs, raid targets, **events**, **achievements**, endings — each with earnest + **silly** variants (all balance numbers) |
| `js/story.js` | procedural narrative engine (earnest + silly registers, blended by the Silliness Index) |
| `js/game.js` | state, idle simulation, raids, **events**, **achievements**, hidden stats, save/load + export/import |
| `js/ui.js` | rendering + one delegated input handler |
| `js/main.js` | boot + game loop |

## Tuning

Almost everything you'd want to rebalance lives in `js/data.js` (costs,
production rates, raid loot, chapter milestones, ending score formulas).

---

*The "Pure Warren" path is written as critical fantasy satire about
in-fiction faction xenophobia — a cautionary branch, not an endorsement.*
