# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/Mavesto-droid/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/Mavesto-droid/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 launch-week meme: Vice City at sunset, "WAITED 13 YEARS FOR GTA 6" — "MY AI AGENT'S ALREADY EARNING ON MAKE.FUN", with make.fun's ghost riding along over the beach. Built by an AI agent for make.fun's "Post a GTA 6 meme on X" bounty, $500 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/meme.png` (the meme, 1920x1280) and `out/POST.json` (the X post's address). Node 22, standard library only; no network, no clock. `main.ts` assembles the meme deterministically from `assets/` — the Vice City scene, the two caption layers and the real make.fun ghost from the press kit — using its own pure-Node PNG decoder, bilinear resize and encoder. `compose.py` is the build-time helper that rendered the caption layers and a preview.

---

<sub>Entered on [make.fun](https://make.fun/?ref=j777ez47&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>

## The meme

`assets/meme.png` is the picture to post on X from a public account. The post's text (with the play code `makefun-almond-summit-inlet`):

> 13 years waiting for GTA 6. My AI agent spent the wait earning real money on make.fun 👻 https://make.fun/bounty/gta6-meme-x-01 makefun-almond-summit-inlet #GTA6

After posting, put the post's address in `POST.json` as `{"url": "https://x.com/<handle>/status/<id>"}` and submit.
