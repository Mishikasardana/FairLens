#!/bin/bash
# FairLens — Google Cloud Deployment Script
# Run: chmod +x deploy.sh && ./deploy.sh

set -e

PROJECT_ID=${1:-"your-gcp-project-id"}
REGION="us-central1"
SERVICE_NAME="fairlens-api"

echo "Deploying FairLens to Google Cloud..."
echo "Project: $PROJECT_ID | Region: $REGION"

# 1. Enable required APIs
echo "Enabling Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  language.googleapis.com \
  aiplatform.googleapis.com \
  firebase.googleapis.com \
  --project=$PROJECT_ID

# 2. Create GCS bucket for datasets
BUCKET_NAME="fairlens-datasets-${PROJECT_ID}"
echo "Creating Cloud Storage bucket: $BUCKET_NAME"
gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME/ 2>/dev/null || echo "Bucket already exists"

# 3. Build frontend
echo "Building frontend..."
npm run build

# 4. Deploy backend to Cloud Run
echo "Deploying backend to Cloud Run..."
cd backend
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY},GCS_BUCKET_NAME=${BUCKET_NAME},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"

BACKEND_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)')
echo "Backend deployed: $BACKEND_URL"

# 5. Deploy frontend to Firebase Hosting
cd ..
echo "Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting --project=$PROJECT_ID

echo ""
echo "✓ FairLens deployed successfully!"
echo "Backend API: $BACKEND_URL"
echo "Frontend: https://$PROJECT_ID.web.app"
echo ""
echo "Test the API: curl $BACKEND_URL/api/health"
