# Backend & Frontend Connection Setup

Your backend and frontend are now connected! Follow these steps to run both servers.

## Prerequisites
- Python 3.8+ installed
- Node.js 16+ and npm installed

## Step 1: Install Backend Dependencies

```bash
cd customer-analytics/backend
pip install -r requirements.txt
```

## Step 2: Run the Backend Server

```bash
cd customer-analytics/backend
python app.py
```

The backend will start on **http://localhost:5000**

Expected output:
```
 * Running on http://0.0.0.0:5000
```

## Step 3: Install Frontend Dependencies (in a new terminal)

```bash
cd customer-analytics/frontend
npm install
```

## Step 4: Run the Frontend Development Server

```bash
cd customer-analytics/frontend
npm run dev
```

The frontend will typically run on **http://localhost:5173** (or show the URL in terminal)

## Configuration

- **Backend API URL**: `http://localhost:5000` (configured in `.env.local`)
- **CORS**: Already enabled in backend (`Flask-CORS`)
- **API Base**: Frontend automatically uses `VITE_API_URL` environment variable

## API Endpoints Available

### Data Management
- `POST /upload` - Upload CSV/XLSX/JSON file
- `GET /analyze` - Get data analysis results
- `POST /reset` - Clear current data

### Analytics
- `GET /kpis` - Get key performance indicators
- `GET /rfm-segments` - Get RFM segmentation analysis
- `GET /churn-prediction` - Get churn risk predictions
- `GET /product-recommendations` - Get product recommendations

### Explainability
- `GET /explain/global` - Get global feature importance
- `GET /explain/customer?customer_id=X` - Get local explanation for customer
- `GET /explain/customer/plot?customer_id=X&plot=waterfall` - Get SHAP plot

### Health Check
- `GET /health` - Check if backend is running

## Testing the Connection

1. Make sure both servers are running
2. Go to **http://localhost:5173** (or your frontend URL)
3. Click "Choose a file" or "Drop your file here"
4. Upload one of the sample CSV files from `backend/uploads/`
5. The dashboard should populate with real data

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on port 5000
- Check firewall settings
- Verify `VITE_API_URL` in `.env.local` is correct

### "CORS error"
- Backend CORS is enabled, but check browser console for specific errors
- Backend must be on `http://localhost:5000`

### "File upload fails"
- Check that uploaded file is CSV, XLSX, or JSON
- Ensure file is under 50MB
- Backend requires columns: `customer_id`, `date`, `amount`

## Environment Variables

**Frontend (.env.local)**:
```
VITE_API_URL=http://localhost:5000
```

This can be changed if you deploy the backend elsewhere.

## Next Steps

1. ✅ Backend and Frontend connected
2. Run the servers (steps 1-4 above)
3. Upload a dataset and test the dashboard
4. For production deployment, see `DEPLOYMENT_GUIDE.md`
