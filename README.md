<div align="center">

<img src="https://img.shields.io/badge/FairLens-AI%20Bias%20Auditor-1a3faa?style=for-the-badge&logoColor=white" />

# FairLens — AI Bias Auditor

### *Uncover hidden discrimination in datasets. Plain-language reports in 10+ languages.*

[![Google Solution Challenge 2025](https://img.shields.io/badge/Google%20Solution%20Challenge-2025-4285F4?style=for-the-badge&logo=google)](https://developers.google.com/community/gdsc-solution-challenge)
[![SDG 10](https://img.shields.io/badge/SDG%2010-Reduced%20Inequalities-DD1367?style=for-the-badge)](https://sdgs.un.org/goals/goal10)
[![Gemini 2.0](https://img.shields.io/badge/Powered%20by-Gemini%202.0%20Flash-8E44AD?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**🌐 Live Demo**: [fairlens-bias-audit.netlify.app](https://fairlens-bias-audit.netlify.app)  
**⚙️ Backend API**: [fairlens-1.onrender.com](https://fairlens-1.onrender.com/docs)

</div>

---

## 🌍 The Problem We Solve

AI systems now decide who gets hired, who receives a loan, who gets medical treatment. These systems learn from historical data — data shaped by decades of human prejudice. The bias gets **automated and amplified at scale**.

Tools to detect this bias exist (IBM AI Fairness 360, Google's What-If Tool) — but they are built **for data scientists**. They produce p-values and confusion matrices that mean nothing to the HR manager, loan officer, or hospital administrator who actually needs to act.

**FairLens bridges that gap.**

Upload any CSV. Get a complete discrimination audit. Receive a plain-language report in your own language — no technical background required.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📊 **4 Statistical Tests** | Demographic Parity Gap, Disparate Impact Ratio (4/5ths rule), Equalized Odds, Chi² significance |
| 🤖 **AI Explanations** | Gemini explains every finding in plain language — no jargon, no PhD required |
| 🌐 **10 Languages** | Full reports in English, Hindi, Spanish, Portuguese, French, Arabic, German, Swahili, Chinese, Japanese |
| 🔧 **One-Click Debiasing** | Reweighting, resampling, threshold calibration with live before/after comparison |
| 📝 **Downloadable Reports** | Export full audit findings as formatted text documents |
| 🔄 **RTL Support** | Arabic reports render right-to-left automatically |
| 🔍 **Multilingual Detection** | Detects sensitive columns in any language — जाति, جنس, Geschlecht all auto-identified |
| 🔒 **Secure Architecture** | Gemini API key lives on the server — never exposed to the browser |

---

## 🎬 How It Works

```
1. Upload CSV          2. Auto-detect columns      3. Run bias audit
   hiring_data.csv  →    gender → Sensitive      →   Score: 42/100
   loan_records.csv       hired  → Outcome            3 critical issues
   medical_data.csv       age    → Sensitive           bias is significant

4. Fix & debias        5. Generate report
   Reweighting       →   Plain-language narrative
   Score: 42 → 78        in your language
                          Downloadable PDF
```

**Try it now** — click "Try with demo data" on the upload screen to see a synthetic hiring dataset with intentional bias across gender, race, and age.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+

### 1. Clone & Run Frontend

```bash
git clone https://github.com/Mishikasardana/FairLens.git
cd FairLens
npm install
npm run dev
```

Open **http://localhost:5173**

### 2. Run Backend

```bash
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend API docs → **http://localhost:8000/docs**

### 3. Get a Free Gemini API Key

1. Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click **"Create API key"**
3. Add it to `backend/.env` as `GEMINI_API_KEY`

---

## 🗂️ Project Structure

```
FairLens/
│
├── 📁 src/                          # React + Vite frontend
│   ├── pages/
│   │   ├── UploadPage.jsx           # CSV upload, column auto-detection & tagging
│   │   ├── AuditPage.jsx            # Bias scores, charts, AI explanations
│   │   ├── FixPage.jsx              # Debiasing strategies + before/after comparison
│   │   └── ReportPage.jsx           # Multilingual Gemini report generation
│   ├── components/
│   │   └── LanguageSelector.jsx     # UI + report language switcher (10 languages)
│   ├── utils/
│   │   ├── gemini.js                # Backend API calls for Gemini
│   │   └── biasEngine.js            # Client-side statistical bias calculations
│   └── i18n/
│       └── locales/                 # en, hi, es, pt, fr, ar, de translations
│
├── 📁 backend/                      # FastAPI Python backend (Render)
│   ├── main.py                      # App entry point + CORS config
│   ├── routers/
│   │   ├── gemini_proxy.py          # Secure Gemini proxy — API key never leaves server
│   │   ├── dataset.py               # Upload, parse, auto-detect sensitive columns
│   │   ├── audit.py                 # Run full bias audit, apply debiasing
│   │   ├── report.py                # Multilingual report generation
│   │   └── health.py                # Health check
│   ├── services/
│   │   ├── bias_engine.py           # Full statistical pipeline (DPG, DIR, EOG, Chi²)
│   │   ├── gemini_service.py        # Gemini 2.0 Flash integration
│   │   └── dataset_store.py         # In-memory store
│   ├── models/
│   │   └── schemas.py               # Pydantic models
│   ├── tests/
│   │   └── test_bias_engine.py      # 16 passing unit tests
│   └── requirements.txt
│
├── firebase.json                    # Firebase Hosting config
├── render.yaml                      # Render deployment config
└── deploy.sh                        # One-command deployment script
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              USER BROWSER (Netlify)                         │
│                                                             │
│  Upload → Audit Dashboard → Fix Studio → Report Generator  │
│                    │                           │            │
└────────────────────┼───────────────────────────┼────────────┘
                     │ REST API (HTTPS)           │
┌────────────────────▼───────────────────────────▼────────────┐
│              FASTAPI BACKEND (Render)                        │
│                                                             │
│  /api/dataset   /api/audit   /api/report   /api/gemini      │
│       │               │            │             │          │
│  pandas parser   bias_engine   multilingual   Gemini proxy  │
│                  (scipy/sklearn)  report gen  (key secured) │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                   GOOGLE AI LAYER                           │
│                                                             │
│         Gemini 2.0 Flash — Reports in 10 languages         │
│         Column detection in Hindi, Arabic, German...        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Bias Metrics

FairLens runs 4 statistical tests on every sensitive attribute:

| Metric | What It Measures | Pass Threshold | Critical Threshold |
|--------|-----------------|----------------|-------------------|
| **Demographic Parity Gap** | Difference in approval rates between groups | < 0.05 | > 0.20 |
| **Disparate Impact Ratio** | Ratio of min to max group rate (4/5ths rule) | ≥ 0.80 | < 0.60 |
| **Equalized Odds Gap** | Difference in true positive rates | < 0.05 | > 0.20 |
| **Chi² p-value** | Statistical significance of the bias | > 0.05 | < 0.01 |

---

## 🌐 Multilingual Architecture

Three independent layers work together:

**Layer 1 — UI Translation**
`react-i18next` with pre-translated JSON files for 7 languages. Switching language instantly re-renders every label, button, and chart. Arabic sets `document.dir = 'rtl'` for full RTL layout.

**Layer 2 — AI Report Generation**
Gemini 2.0 Flash generates the complete audit narrative natively in the target language. No translation API — Gemini writes fluent Hindi, Arabic, French etc. from scratch with culturally appropriate phrasing.

**Layer 3 — Multilingual Data Detection**
Gemini recognizes sensitive attribute names across languages:
```
Hindi:    जाति (caste)  लिंग (gender)  आयु (age)
Arabic:   جنس (gender)  عمر (age)      دين (religion)
German:   Geschlecht    Alter          Rasse
Spanish:  género        edad           raza
Swahili:  jinsia        umri           kabila
```
A dataset built in Hindi gets correctly audited with zero manual setup.

---

## 🛠️ Google APIs Used

| API | How FairLens Uses It |
|-----|---------------------|
| **Gemini 2.0 Flash** | Generates audit reports in 10 languages; explains bias metrics in plain language; auto-detects sensitive column names across languages |
| **Vertex AI** | Model fairness evaluation at production scale |
| **Natural Language API** | Detects sensitive entities in free-text columns |
| **Cloud Storage** | Stores datasets and generated reports |
| **BigQuery ML** | Statistical analysis on large datasets |
| **Firebase** | Auth, audit history, team workspaces |
| **Cloud Run** | Alternative containerized backend deployment |

---

## ☁️ Deployment

### Live Production
| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Netlify | [fairlens-bias-audit.netlify.app](https://fairlens-bias-audit.netlify.app) |
| Backend | Render | [fairlens-1.onrender.com](https://fairlens-1.onrender.com) |

### Environment Variables

**Backend (Render)**
```env
GEMINI_API_KEY=your_gemini_api_key
APP_ENV=production
ALLOWED_ORIGINS=https://fairlens-bias-audit.netlify.app
SECRET_KEY=your_secret_key
```

**Frontend (Netlify)**
```env
VITE_API_URL=https://fairlens-1.onrender.com/api
```

### Deploy Your Own

```bash
# Backend → Render
# Connect GitHub repo, set Root Directory = backend
# Build: pip install -r requirements.txt
# Start: uvicorn main:app --host 0.0.0.0 --port $PORT

# Frontend → Netlify
npm run build
netlify deploy --prod --dir=dist
```

---

## 🧪 Tests

```bash
cd backend
pip install pytest
python -m pytest tests/ -v
```

```
16 passed in 3.32s ✅
```

Tests cover: DPG detection, DIR 4/5ths rule, severity classification, Chi² significance, full audit pipeline, reweighting/resampling, multilingual column detection (including Hindi column names).

---

## 🌱 SDG Alignment

| SDG | Impact |
|-----|--------|
| **SDG 10** — Reduced Inequalities | Identifies and eliminates discriminatory AI systems affecting marginalized groups |
| **SDG 8** — Decent Work | Audits hiring bias to ensure fair job opportunities regardless of gender, race, or age |
| **SDG 3** — Good Health | Detects demographic bias in medical triage and diagnosis systems |
| **SDG 16** — Justice & Strong Institutions | Ensures fairness in loan, legal, and government AI decisions |

---

## 💡 What Makes FairLens Novel

Every existing bias tool was built for data scientists. FairLens is the **first bias auditor where the primary output is a plain-language narrative in the user's own language** — readable and actionable by non-technical decision-makers.

**Unique combination not found in any existing tool:**

✅ Multilingual AI-generated reports (natively written, not translated)  
✅ Sensitive column detection across non-English datasets (Hindi, Arabic, Swahili)  
✅ RTL layout for Arabic  
✅ Secure backend proxy — Gemini API key never exposed to browser  
✅ One-click debiasing with live before/after score comparison  
✅ Zero ML expertise required  

---

## 👥 Team

Built for **Google Solution Challenge 2025** by GDSC members committed to making AI systems fairer for everyone.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**FairLens** · Google Solution Challenge 2025 · SDG 10: Reduced Inequalities

*Making AI fairness accessible to everyone, in every language.*

⭐ Star this repo if you found it useful!

</div>
