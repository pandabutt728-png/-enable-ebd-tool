# EBD Brief Generator — Enable

A clean, standalone web app for generating pre-meeting briefs for Andrew and the Enable sales team.

## Features

- **New brief form** — structured input for meeting details, attendees, company context, Andrew's role, messaging strategy, objectives, and win condition
- **Smart brief output** — renders a formatted, visually structured brief in a modal with navy header, green Andrew section, two-column messaging strategy, and a highlighted win condition box
- **Auto-save** — form state persists to `localStorage` automatically; survives page refreshes
- **Brief history** — every generated brief is saved; load, view, or regenerate from history
- **LinkedIn / contact lookup** — paste in client names and titles to trigger an AI-powered professional intelligence brief (works inside Claude.ai; in standalone mode renders a placeholder)
- **Print / PDF export** — built-in print stylesheet for clean single-page output

## Getting started

No build step required. This is a plain HTML/CSS/JS app.

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/ebd-brief-generator.git
cd ebd-brief-generator

# Open directly in your browser
open index.html

# Or serve locally
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Project structure

```
ebd-brief-generator/
├── index.html        # Main app shell
├── styles.css        # All styles (light + dark mode)
├── app.js            # All logic (form, brief builder, history, LinkedIn)
├── assets/
│   ├── logo.png      # Enable logo (add your own)
│   └── favicon.png   # Enable favicon (add your own)
└── README.md
```

## Assets

Place the Enable logo at `assets/logo.png` and favicon at `assets/favicon.png`. If the logo file is missing, a built-in SVG fallback is shown automatically.

## LinkedIn lookup

The LinkedIn lookup tab works in two modes:

- **Inside Claude.ai** — uses `sendPrompt()` to fire a structured research prompt into the Claude chat, which then returns an AI-powered profile card
- **Standalone** — shows a placeholder; you can wire this to your own AI endpoint by editing `lookupLinkedIn()` in `app.js`

## Word doc export

When embedded in Claude.ai, say "Word doc" after generating a brief to download a formatted `.docx` with the Enable logo, navy banner, and green section dividers.

## Customisation

All colours are CSS variables in `:root` inside `styles.css`:

```css
--navy: #1a2e3d;
--green: #2d7a3a;
```

Change these to match your brand.

## Browser support

Works in all modern browsers. No dependencies, no build tools, no frameworks.

---

Built for Enable's revenue team.
