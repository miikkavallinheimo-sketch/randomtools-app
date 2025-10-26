![Static Site](https://img.shields.io/badge/site-static-brightgreen)
![PWA](https://img.shields.io/badge/PWA-offline%20ready-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

# 🎲 RandomTools.app — Open Random Generators

**RandomTools.app** is a collection of simple, fast, and privacy-friendly random generators built for games, decisions, and everyday fun.  
Flip a coin, roll dice, spin a decision wheel, or pick random numbers — all in your browser, with no data collection and full offline support.

---

## ✨ Features
- 🧠 **Truly random, not ads** — lightweight pseudorandom logic for fair results  
- 🚫 **No tracking, no cookies, no analytics**  
- 📱 **Works offline** (PWA ready, installable on desktop and mobile)  
- ⚡️ **Fast and minimal** — pure HTML, CSS, and JavaScript, no frameworks  
- 🔍 **SEO optimized** — structured data (JSON-LD), sitemaps, canonical URLs  
- 🎨 **Accessible UI** with keyboard and touch controls  

---

## 🧩 Available Tools

| Tool | Description |
|------|--------------|
| 🪙 [Coin Flipper](/coin-flip/) | Flip a fair coin — heads or tails — with smooth animation |
| 🎲 [Dice Roller](/dice-roller/) | Roll 1–20 dice at once, including D&D dice sets |
| 🎯 [Random Number Generator](/random-number-generator/) | Pick a random number between any two values |
| 🎡 [Decision Wheel](/decision-wheel/) | Spin the wheel of fortune for random decisions |
| 🃏 [Card Draw](/card-draw/) | Draw cards from a shuffled deck (coming soon) |

All tools are **open-source** and can be used **offline** once cached.

---

## 🧠 How It Works

Each tool uses JavaScript's pseudorandom generator (`Math.random()`), enhanced with seed-mixing and entropy from user events (clicks, timing jitter, etc.).  
The randomness is sufficient for games, classroom decisions, and simple probability experiments.

> **Note:** These tools are *not* for cryptographic use — they're designed for fun, fairness, and education.

---

## ⚙️ Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JS  
- **Build/Host:** Cloudflare Pages  
- **SEO:** JSON-LD schema, sitemap.xml, robots.txt, canonical URLs  
- **Design:** Minimal PWA with dark/light adaptive theme  

---

## 🧩 Embedding & Reuse

You can embed any RandomTools app on your website:

```html
<iframe src="https://randomtools.app/coin-flip/" width="300" height="400"></iframe>
```
---

## 🔍 SEO Keywords

random tools, random generator, coin flip, coin flipper, fair coin flip, dice roller, dnd dice, online dice roller, number generator, random number picker, random number selector, decision wheel, spin the wheel, random decision maker, random picker, wheel of fortune, randomizer app, privacy-friendly random tools, offline random generator, javascript random app, cloudflare pages, open source pwa