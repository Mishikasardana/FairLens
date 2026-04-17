# FairLens — AI Bias Auditor

> Detect and explain hidden bias in AI datasets. Plain-language reports in 10+ languages. Powered by Gemini 1.5 Pro.

**Google Solution Challenge 2025 · SDG 10: Reduced Inequalities**

---

## What FairLens Does

FairLens lets any organization — regardless of technical expertise — audit their datasets and AI models for hidden discrimination. Upload a CSV of hiring records, loan approvals, or medical decisions and get:

- **Statistical bias metrics**: Demographic Parity Gap, Disparate Impact Ratio, Equalized Odds, Chi² significance
- **Plain-language explanations**: Gemini explains every finding in non-technical language
- **Multilingual reports**: Full audit reports generated in English, Hindi, Spanish, Portuguese, French, Arabic, German, Swahili, Chinese, or Japanese
- **Debiasing tools**: One-click reweighting, resampling, and threshold calibration
- **RTL support**: Arabic reports render right-to-left automatically

---

## Google APIs Used

| API | Purpose |
|-----|---------|
| **Gemini 1.5 Pro** | Multilingual report generation, metric explanations, column detection |
| **Vertex AI** | Model evaluation and fairness scoring (production) |
| **Natural Language API** | Detect sensitive attributes in text columns |
| **Cloud Storage** | Dataset and report storage (production) |
| **BigQuery ML** | Large-scale statistical analysis (production) |
| **Firebase** | Auth, audit history, team workspaces |
| **Cloud Run** | Containerized backend deployment |

---

## Project Structure

```
fairlens/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── UploadPage.jsx      # Dataset upload + column tagging
│   │   ├── AuditPage.jsx       # Bias metrics + charts
│   │   └── ReportPage.jsx      # Multilingual Gemini report
│   ├── components/
│   │   └── LanguageSelector.jsx # UI language + report language picker
│   ├── utils/
│   │   ├── gemini.js           # Gemini API calls (client-side)
│   │   └── biasEngine.js       # Statistical bias calculations (JS)
│   └── i18n/
│       └── locales/            # Translations: en, hi, es, pt, fr, ar, de
│
└── backend/                    # FastAPI Python backend
    ├── main.py                 # App entry point
    ├── routers/
    │   ├── dataset.py          # Upload, parse, detect columns
    │   ├── audit.py            # Run bias audit, debiasing
    │   └── report.py           # Multilingual report generation
    ├── services/
    │   ├── bias_engine.py      # Full statistical analysis
    │   ├── gemini_service.py   # Gemini integration
    │   └── dataset_store.py    # In-memory store (swap GCS in prod)
    └── models/
        └── schemas.py          # Pydantic request/response models
```

---

## Quick Start

### 1. Frontend

```bash
cd fairlens
npm install
npm run dev
```

Open http://localhost:5173 — the app works standalone using Gemini directly from the browser.

### 2. Backend (optional for production features)

```bash
cd fairlens/backend
cp .env.example .env
# Fill in GEMINI_API_KEY and other values

pip install -r requirements.txt
uvicorn main:app --reload
```

API docs: http://localhost:8000/docs

### 3. Get a Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Paste it into the app (top-right "Add API key" button)

---

## Key Bias Metrics Explained

| Metric | What it measures | Ideal value | Fail threshold |
|--------|-----------------|-------------|----------------|
| **Demographic Parity Gap** | Difference in positive outcome rates | 0.0 | > 0.10 (high), > 0.20 (critical) |
| **Disparate Impact Ratio** | Ratio of lowest to highest group rate | 1.0 | < 0.80 (4/5ths rule) |
| **Equalized Odds Gap** | Difference in true positive rates | 0.0 | > 0.10 |
| **Chi² p-value** | Statistical significance of bias | > 0.05 | < 0.05 significant |

---

## Multilingual Architecture

The multilingual system works at three layers:

1. **UI layer**: `react-i18next` with pre-translated JSON files. Switching language instantly translates all buttons, labels, and navigation. Arabic triggers RTL layout via `document.dir = 'rtl'`.

2. **AI report layer**: Gemini 1.5 Pro generates the full audit narrative in whatever language is selected. The prompt ends with `"Write ENTIRELY in {LANGUAGE}"`. Gemini handles all 10 supported languages natively — no translation API needed for the report.

3. **Data detection layer**: The column auto-detection prompt includes examples of sensitive attribute names in Hindi (जाति), Arabic (جنس), German (Geschlecht), etc. so Gemini correctly flags them even in non-English datasets.

---

## Deploy to Google Cloud

```bash
# Build and deploy backend to Cloud Run
cd backend
gcloud run deploy fairlens-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key

# Deploy frontend to Firebase Hosting
cd ..
npm run build
firebase deploy
```

---

## Demo Dataset

The app ships with a synthetic hiring dataset (`hiring_demo.csv`) with intentional bias across gender, race, and age — perfect for demos. Click "Try with demo data" on the upload screen.

---

## SDG Alignment

- **SDG 10** (Reduced Inequalities): Directly detects and helps eliminate discriminatory AI systems
- **SDG 8** (Decent Work): Targets hiring bias specifically
- **SDG 3** (Good Health): Medical decision bias detection
- **SDG 16** (Justice): Fairness in legal and financial decisions

---

## What Makes FairLens Novel

Most fairness tools (IBM AI Fairness 360, Google's What-If Tool) are built for data scientists. FairLens is the first bias auditor designed for **non-technical decision-makers** — HR managers, hospital administrators, loan officers — with reports in their own language.

The combination of:
- Multilingual plain-English (plain-language) reports via Gemini
- Multilingual *dataset* column detection (जाति, جنس, Geschlecht all detected as "caste/gender")
- RTL rendering for Arabic
- One-click debiasing

...does not exist in any current open-source or commercial fairness tool.
