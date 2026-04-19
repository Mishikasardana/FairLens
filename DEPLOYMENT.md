# FairLens Cloud Deployment Guide

## Prerequisites

- Google Cloud Account with billing enabled
- `gcloud` CLI installed and authenticated
- `firebase` CLI installed (`npm install -g firebase-tools`)
- Docker installed (for local testing)
- Node.js 20+ and Python 3.11+

## Quick Deploy to Google Cloud Run + Firebase

### Step 1: Set Environment Variables

```bash
export GCP_PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export GEMINI_API_KEY="your-api-key-from-google-ai-studio"
```

### Step 2: Create GCS Bucket (one-time)

```bash
gsutil mb -p $GCP_PROJECT_ID -l $REGION gs://fairlens-datasets-${GCP_PROJECT_ID}/
```

### Step 3: Run Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh $GCP_PROJECT_ID
```

The script will:
- ✅ Enable required Google Cloud APIs
- ✅ Create Cloud Storage bucket
- ✅ Build and deploy backend to Cloud Run
- ✅ Deploy frontend to Firebase Hosting

---

## Local Testing with Docker Compose

### Development (with hot reload)
```bash
docker-compose up
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Production Preview
```bash
# Set environment variables first
export GEMINI_API_KEY="your-key"
export GOOGLE_CLOUD_PROJECT="your-project"
export GCS_BUCKET_NAME="fairlens-datasets-your-project"
export ALLOWED_ORIGINS="https://yourdomain.com"

docker-compose -f docker-compose.prod.yml up
```

---

## Configuration

### Backend Environment Variables

Copy `.env.production` template and fill in values:
```bash
cp backend/.env.production backend/.env
```

**Required:**
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `GOOGLE_CLOUD_PROJECT` - Your GCP project ID
- `GCS_BUCKET_NAME` - Cloud Storage bucket for datasets

**Important for Production:**
- `ALLOWED_ORIGINS` - Update to your domain (CORS whitelist)
- `APP_ENV=production` - Disables debug mode and reload

### Frontend Configuration

Update VITE environment variables in `docker-compose.prod.yml`:
- `VITE_API_URL` - Backend API endpoint (e.g., `https://api.yourdomain.com`)

---

## Deployment Checklist

- [ ] GCP Project created with billing enabled
- [ ] Gemini API key generated
- [ ] Environment variables configured
- [ ] Domain/DNS setup complete
- [ ] Firebase project initialized (`firebase init`)
- [ ] `.env` file NOT committed to git (verify `.gitignore`)
- [ ] Run local tests: `pytest backend/tests/`
- [ ] Test with docker-compose before deploying

---

## Monitoring & Logs

### View Backend Logs (Cloud Run)
```bash
gcloud run logs read fairlens-api --region=us-central1 --limit=50
```

### View Frontend Logs (Firebase)
```bash
firebase functions:log
```

### Test API Health
```bash
curl https://your-backend-url/api/health
```

---

## Cost Optimization

**Google Cloud Run:**
- Free tier: 2M requests/month, 360K GB-seconds/month
- Auto-scaling: 0 instances at idle (pay only for requests)

**Firebase Hosting:**
- Free tier: 1 GB/month storage, 10 GB/month bandwidth

**Gemini API:**
- Free tier: 60 requests/min, 10K requests/day
- Monitor usage in [AI Studio](https://makersuite.google.com/app/apikey)

---

## Troubleshooting

**API Key Expired Error**
- Regenerate key at https://makersuite.google.com/app/apikey
- Update `GEMINI_API_KEY` environment variable
- Restart backend service

**Rate Limiting (429 errors)**
- Implement backoff: Already configured in `gemini_service.py`
- Free tier: 60 requests/minute limit
- Consider upgrading to paid tier for production

**CORS Errors**
- Update `ALLOWED_ORIGINS` to match your frontend domain
- Include both HTTP and HTTPS if applicable

---

## Rollback

```bash
# Revert to previous Cloud Run revision
gcloud run services update-traffic fairlens-api \
  --to-revisions PREVIOUS_REVISION=100 \
  --region=us-central1
```

---

## Support

For issues, check:
1. Cloud Run logs: `gcloud run logs read fairlens-api`
2. Backend health: `curl https://your-backend-url/api/health`
3. GCS bucket permissions: `gsutil ls gs://your-bucket/`
