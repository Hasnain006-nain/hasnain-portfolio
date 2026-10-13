# Hasnain Haider Portfolio

A multi-file portfolio project built around the exact WebGL fluid engine from:

- https://github.com/tkabalin/WebGL-Fluid-Background
- Original upstream project: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation

The fluid engine and its configuration/assets are included locally so the
simulation can run in a normal browser environment without iframe tricks.

## Project structure

```text
hasnain-portfolio/
├── index.html
├── webgl-fluid.js
├── config.json
├── LDR_LLL1_0.png
├── LICENSE
├── README.md
├── assets/
│   ├── favicon.svg
│   ├── hasnain.png
│   └── neon-holographic-skull-portrait.png
├── styles/
│   └── portfolio.css
└── scripts/
    └── portfolio.js
```

## Important: do not open index.html by double-clicking

`webgl-fluid.js` loads `config.json` with `fetch()`. Browsers often block that
when the page uses a `file://` URL.

Run the folder through a local web server instead.

### Option 1 — VS Code Live Server

1. Open the `hasnain-portfolio` folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

### Option 2 — Python

From the project folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Option 3 — Node

```bash
npx serve .
```

Then open the localhost address shown in the terminal.

## Expected first screen

The first viewport contains the WebGL fluid canvas with:

- `Welcome to my lab.`
- `This is Hasnain Haider.`

Move the cursor across the page. The included `webgl-fluid.js` listens directly
to mouse movement on the canvas and creates the same random colored splats as
the linked GitHub project.

Then scroll down into the portfolio.

## Fluid settings

The included `config.json` is the same configuration from the linked repository,
including:

- `SIM_RESOLUTION`: 128
- `DYE_RESOLUTION`: 1024
- `SPLAT_FORCE`: 6000
- `COLORFUL`: true
- `RANDOM_COLORS`: true
- white background
- shading enabled
- sunrays enabled
- bloom disabled

## Editing

- Portfolio content: `index.html`
- Portfolio styling: `styles/portfolio.css`
- Portfolio scroll/hover/reveal behavior: `scripts/portfolio.js`
- Fluid physics/rendering: `webgl-fluid.js`
- Fluid settings: `config.json`
- Portrait: `assets/hasnain.png`

## WebGL note

The fluid effect requires a WebGL-compatible browser. Chrome or Edge is
recommended for development.

## Publish with GitHub and Vercel

This is a static site. There is no package installation or build step. Make
`hasnain-portfolio` the Git repository root so `index.html` is at the top level.

From this folder in a terminal:

```bash
git init -b main
git add .
git commit -m "Publish portfolio"
gh auth login
gh repo create --source=. --remote=origin --push
```

The final `gh` command prompts for the repository name and public/private
visibility. If GitHub CLI is not installed, create an empty repository on
GitHub, add it as `origin`, and push `main` instead.

In Vercel, choose **Add New Project**, import that GitHub repository, and use:

- **Root Directory:** repository root (the default)
- **Framework Preset:** Other
- **Build Command:** override with an empty value
- **Output Directory:** leave at the default

Deploy the project. Future pushes to the connected production branch will
trigger new deployments. Before sharing the site, check that the Google Drive
CV and event folders are viewable by visitors without signing in.

## License

The included WebGL fluid files are distributed under the MIT License contained
in `LICENSE`.
