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

### Live Demo (Production)
- **Frontend**: https://fairlens-bias-audit.netlify.app (Netlify)
- **Backend**: https://fairlens-1.onrender.com (Render)

### Local Development

#### Frontend Only (Client-side Gemini)
```bash
npm install
npm run dev
```
Open http://localhost:5173 — the app works standalone using Gemini directly from the browser.

#### Full Stack (with backend)
```bash
# Terminal 1: Backend
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY and required variables
pip install -r requirements.txt
uvicorn main:app --reload
# Backend runs on http://localhost:8000

# Terminal 2: Frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

Backend API docs available at: http://localhost:8000/docs

### Get a Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. For backend deployment: add to environment variables
4. For frontend-only mode: paste in the app UI (top-right "Add API key" button)

---

## Deployment Guide

FairLens is deployed on **Netlify (frontend)** and **Render (backend)** for scalability and zero-cost hosting.

### Architecture

```
Frontend (React)                Backend (FastAPI)
Netlify                         Render
└─ fairlens-bias-audit.         └─ fairlens-1.onrender.com
   netlify.app                     /api/*
   ↓                            ↓
   VITE_API_URL env var ────→ https://fairlens-1.onrender.com/api
```

### Environment Variables

#### Frontend (Netlify)
Set these in **Site Settings → Build & Deploy → Environment**:

```
VITE_API_URL = https://fairlens-1.onrender.com/api
```

#### Backend (Render)
Set these in **Service Settings → Environment**:

```
# Required
GEMINI_API_KEY = your-api-key-from-google-ai-studio
GOOGLE_CLOUD_PROJECT = your-gcp-project-id
GCS_BUCKET_NAME = your-gcs-bucket-name
ALLOWED_ORIGINS = https://fairlens-bias-audit.netlify.app

# Recommended
APP_ENV = production
MAX_FILE_SIZE_MB = 50
SECRET_KEY = generate-a-random-secret-key-here
```

### Deploy to Netlify (Frontend)

1. **Connect GitHub**:
   ```bash
   # Push code to GitHub repo
   git push origin main
   ```

2. **Create Netlify Site**:
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Select GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Set Environment Variables**:
   - Site Settings → Build & Deploy → Environment
   - Add `VITE_API_URL`

4. **Redeploy** (after setting env vars):
   - Go to Deploys tab
   - Click "Trigger deploy" → "Deploy site"

### Deploy to Render (Backend)

1. **Connect GitHub**:
   ```bash
   # Push code to GitHub
   git push origin main
   ```

2. **Create Render Service**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Set Runtime: `Python 3.11`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Set Environment Variables**:
   - Service Settings → Environment
   - Add all variables from above

4. **Deploy**:
   - Click "Deploy" button
   - Wait for deployment to complete

### CORS Configuration

The backend has CORS middleware configured to allow requests from your Netlify domain:

```python
origins = [os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Important**: If you change your domain, update `ALLOWED_ORIGINS` on Render and redeploy.

### Troubleshooting Deployment

#### CORS Error (No 'Access-Control-Allow-Origin' header)
**Cause**: Backend doesn't know your frontend's domain.
**Fix**:
1. Go to Render → Settings → Environment
2. Verify `ALLOWED_ORIGINS` matches your Netlify URL exactly (no trailing slash)
3. Click Deploy to redeploy backend

#### Frontend Still Points to Localhost
**Cause**: Netlify site was built before environment variable was set.
**Fix**:
1. Go to Netlify → Deploys tab
2. Click "Trigger deploy" → "Deploy site"

#### 500 Internal Server Error on Audit
**Cause**: Missing environment variables on Render.
**Fix**:
1. Check Render logs: Service → Logs
2. Verify all required env vars are set
3. Click Deploy to redeploy

#### NaN/Inf JSON Errors
**Fixed in v1.1**: Backend now handles constant input arrays (where correlation cannot be computed).

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

## Alternative: Deploy to Google Cloud

For production deployments with more control, use Google Cloud Run + Firebase Hosting:

```bash
# Backend: Cloud Run
cd backend
gcloud run deploy fairlens-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,ALLOWED_ORIGINS=https://your-domain.web.app

# Frontend: Firebase Hosting
cd ..
npm run build
firebase deploy
```

Update `VITE_API_URL` in `.env.production` to your Cloud Run URL.

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

---

## Recent Updates (v1.1)

### ✅ Fixed & Improved
- **Production Deployment**: Frontend on Netlify + Backend on Render
- **CORS Configuration**: Proper cross-origin handling for frontend-backend communication
- **JSON Serialization**: Handle NaN/Inf values in bias metrics (prevents 500 errors)
- **Dynamic Port Support**: Backend respects `PORT` environment variable for Render
- **Environment Variables**: Centralized configuration for production deployments
- **Hardcoded Localhost Removal**: All API calls now use configurable endpoints

### 📚 Documentation
- Added comprehensive deployment guide for Netlify + Render
- Added environment variable reference
- Added CORS troubleshooting guide
- Added deployment troubleshooting section

### 🔧 Technical Changes
- `src/pages/UploadPage.jsx`: Replaced hardcoded localhost with `uploadDataset()` API utility
- `backend/main.py`: Improved CORS origin parsing (strips whitespace)
- `backend/Dockerfile`: Dynamic port support via `PORT` env var
- `backend/models/schemas.py`: Added validators to clean NaN/Inf float values
- `.env`: Updated `VITE_API_URL` for production backend

---
