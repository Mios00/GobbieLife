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
| `js/data.js` | resources, buildings, jobs, raid targets, **events**, **achievements**, endings (all balance numbers) |
| `js/story.js` | procedural narrative engine |
| `js/game.js` | state, idle simulation, raids, **events**, **achievements**, hidden stats, save/load + export/import |
| `js/ui.js` | rendering + one delegated input handler |
| `js/main.js` | boot + game loop |

## Tuning

Almost everything you'd want to rebalance lives in `js/data.js` (costs,
production rates, raid loot, chapter milestones, ending score formulas).

---

*The "Pure Warren" path is written as critical fantasy satire about
in-fiction faction xenophobia — a cautionary branch, not an endorsement.*
