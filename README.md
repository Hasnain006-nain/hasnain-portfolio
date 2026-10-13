# Hasnain Haider — Applied Intelligence Portfolio

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-hasnain--portfolio.vercel.app-74ddc9?style=for-the-badge&logo=vercel&logoColor=black)](https://hasnain-portfolio-snowy.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![WebGL Fluid](https://img.shields.io/badge/WebGL-Fluid%20Simulation-purple?style=for-the-badge&logo=webgl)](https://hasnain-portfolio-snowy.vercel.app#lab)
[![Tech Stack](https://img.shields.io/badge/Built%20With-HTML5%20%7C%20CSS3%20%7C%20JS-F16529?style=for-the-badge)](https://github.com/Hasnain006-nain/hasnain-portfolio)

<p align="center">
  <strong>Computer Science Researcher & AI Systems Builder</strong><br>
  Applied Machine Learning · Agentic AI · Computer Vision · CPU-Only RAG · Trustworthy AI
</p>

[**Explore Live Portfolio ↗**](https://hasnain-portfolio-snowy.vercel.app) · [**Download CV ↗**](https://drive.google.com/file/d/1-IOyj2U32JB1_o_sIrCoPV8zj-jeC_fr/view?usp=sharing) · [**Get in Touch ↗**](mailto:hhnain1006@gmail.com)

---

</div>

## Overview

Welcome to the official repository for **Hasnain Haider's** personal portfolio and research lab.

This project delivers an interactive, high-performance web experience centered around an embedded WebGL real-time fluid dynamics simulation, dark-mode cybernetic aesthetics, live product telemetry HUDs, and rigorous research showcases.

### ✨ Key Features

- **Interactive WebGL Fluid Canvas**: Real-time fluid dynamics and particle physics responding directly to user pointer movements and touch.
- **Fluid Lab Experience**: Immersive landing section with responsive canvas dimensions, configurable dye resolution, splat forces, and shading.
- **Responsive Mobile Navigation**: Accessible drawer menu with smooth jump navigation, keyboard escape handling, and outside-click dismissal.
- **Interactive Research Telemetry**: Bespoke interactive mockups demonstrating real model metrics (PalmSightCare, TinyRAG, LC-ORF, Day90 Guardian).
- **Zero-Dependency Static Architecture**: Pure semantic HTML5, modern CSS3, and vanilla ES6+ JavaScript—ultra-fast load times and seamless Vercel edge deployment.

---

## 🔬 Featured Projects & Research

| Project | Focus | Metrics / Highlights | Repository |
| :--- | :--- | :--- | :--- |
| **PalmSightCare** | On-device mobile cataract screening (MobileNetV2) | **99.69% accuracy** · 25.9 ms latency · 10.4 MB | [GitHub ↗](https://github.com/Hasnain006-nain/cataract-detection-transfer-learning) |
| **TinyRAG** | Reproducible local RAG benchmark on 16 GB CPU-only laptop | **Recall@5: 95.2%** · MRR: 0.868 · CPU-only | [GitHub ↗](https://github.com/Hasnain006-nain/TinyRAG) |
| **LC-ORF Fraud Evaluation** | Operational robustness audit framework for financial classifiers | **3 datasets** · 75 model units · 6 audit axes | [GitHub ↗](https://github.com/Hasnain006-nain/lc-orf-financial-fraud-robustness) |
| **Day90 Guardian** | Agentic AI employee-risk command center with 6 operators | **2nd Place in Asia** · Semantic routing & tool calling | [GitHub ↗](https://github.com/Hasnain006-nain/day90-guardian-command-center) |
| **Fetal Ultrasound AI** | Memorization-resistant fetal plane recognition | Cross-country external validation (Ongoing) | *In Progress* |

---

## 📁 Repository Structure

```text
hasnain-portfolio/
├── index.html               # Main portfolio markup & semantic structure
├── webgl-fluid.js           # High-performance WebGL fluid physics engine
├── config.json              # Fluid simulation parameters & render config
├── LDR_LLL1_0.png           # Texture resource for fluid lighting/shading
├── LICENSE                  # MIT License
├── README.md                # Project documentation
├── assets/                  # Brand icons, profile imagery & assets
│   ├── favicon.svg
│   ├── hasnain.png
│   └── neon-holographic-skull-portrait.png
├── styles/
│   └── portfolio.css        # Responsive styling, neomorphic themes & animations
└── scripts/
    └── portfolio.js         # Navigation behavior, tilt interactions & scroll logic
```

---

## 🚀 Getting Started

### Local Development

Because `webgl-fluid.js` fetches `config.json` via the `fetch()` API, run the project through a local web server (opening via `file://` directly may trigger browser CORS restrictions):

#### Option 1 — Python
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

#### Option 2 — Node.js
```bash
npx serve .
```

#### Option 3 — VS Code Live Server
1. Open the project directory in **VS Code**.
2. Right-click `index.html` and choose **Open with Live Server**.

---

## ⚙️ Fluid Simulation Configuration

The fluid simulation is customized via `config.json`:

```json
{
  "SIM_RESOLUTION": 128,
  "DYE_RESOLUTION": 1024,
  "SPLAT_FORCE": 6000,
  "COLORFUL": true,
  "RANDOM_COLORS": true,
  "BACK_COLOR": { "r": 6, "g": 7, "b": 11 },
  "SHADING": true,
  "SUNRAYS": true,
  "BLOOM": false
}
```

---

## 🌐 Deployment

The site is deployed continuously to **Vercel**:

- **Production URL**: [https://hasnain-portfolio-snowy.vercel.app](https://hasnain-portfolio-snowy.vercel.app)
- **Deployment Platform**: [Vercel](https://vercel.com/)
- **Configuration**: Zero-build static deployment (`Framework Preset: Other`)

---

## 📬 Connect

- **Portfolio**: [hasnain-portfolio-snowy.vercel.app](https://hasnain-portfolio-snowy.vercel.app)
- **GitHub**: [@Hasnain006-nain](https://github.com/Hasnain006-nain)
- **Email**: [hhnain1006@gmail.com](mailto:hhnain1006@gmail.com)

---

## 📄 License

The portfolio code is open source under the [MIT License](LICENSE).
The embedded WebGL fluid simulation is based on works by [PavelDoGreat](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) and [tkabalin](https://github.com/tkabalin/WebGL-Fluid-Background).
