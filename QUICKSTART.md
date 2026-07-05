# 🚀 Quick Start Guide

## Customer Analytics Backend - Python + ML Models

Your backend is ready! Here's how to get started:

## Installation (First Time Only)

```bash
cd backend
python install_dependencies.bat
```

## Starting the Server

```bash
# From backend folder
start.bat
```

## Testing the Backend

Once the server is running at `http://localhost:5000`:

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Upload Sample Data
```bash
cd backend
curl -X POST -F "file=@sample_data.csv" http://localhost:5000/upload
```

### 3. Get Analysis
```bash
curl http://localhost:5000/analyze
```

### 4. Get RFM Segments
```bash
curl http://localhost:5000/rfm-segments
```

### 5. Get Churn Predictions
```bash
curl http://localhost:5000/churn-prediction
```

### 6. Get Product Recommendations
```bash
curl http://localhost:5000/product-recommendations
```

## Your Data Format

Upload a CSV, Excel, or JSON file with these required columns:

```csv
CustomerID,PurchaseDate,Amount,Product,Category
C001,2024-01-15,150.00,Coffee Beans,Beverages
C002,2024-01-16,85.50,Headphones,Electronics
C003,2024-01-18,120.00,Planner,Stationery
```

**Required:**
- `CustomerID` - Unique customer ID
- `PurchaseDate` - Date in YYYY-MM-DD format
- `Amount` - Purchase amount (number)

**Optional:**
- `Product` - Product name
- `Category` - Product category
- `Quantity` - Items purchased

## ML Models Included

### 🎯 RFM Segmentation
Segments customers into 4 groups based on:
- **Recency** (R): Days since last purchase
- **Frequency** (F): Number of purchases
- **Monetary** (M): Total spending

**Output:**
- Champions, Loyal, At Risk, Low Value customers
- Segment sizes and revenue contribution

### ⚠️ Churn Prediction
Identifies customers at risk of leaving:
- Analyzes purchase patterns
- Calculates risk scores (0-100)
- Risk levels: Low, Medium, High

### 🛍️ Product Recommendations
Suggests cross-sell and upsell opportunities:
- Product co-occurrence analysis
- Confidence metrics
- Lift calculations

### 🔍 Anomaly Detection
Detects unusual spending behavior:
- Statistical outlier detection
- Z-score analysis
- Unusual purchase patterns

## Project Structure

```
backend/
├── app.py                  # Main Flask API
├── ml_models.py           # ML implementations
├── config.py              # Configuration
├── requirements.txt       # Dependencies
├── sample_data.csv        # Test data
├── setup.py               # Setup script
├── start.bat              # Windows startup
├── start.sh               # Linux/Mac startup
├── train_models.py        # Model training
├── API_GUIDE.md           # API documentation
├── README.md              # Full documentation
└── uploads/               # Uploaded files

frontend/                  # React frontend
├── src/
├── App.jsx
├── main.jsx
└── ... (already exists)
```

## Environment Variables

Create a `.env` file in the backend folder (optional):

```
FLASK_ENV=development
FLASK_DEBUG=True
API_URL=http://localhost:5000
MAX_FILE_SIZE=52428800
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload customer data |
| GET | `/analyze` | Get comprehensive analysis |
| GET | `/kpis` | Get key metrics |
| GET | `/rfm-segments` | Get RFM segments |
| GET | `/churn-prediction` | Get churn predictions |
| GET | `/product-recommendations` | Get recommendations |
| POST | `/reset` | Clear current data |

## Troubleshooting

### Port 5000 Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Python Not Found
- Ensure Python 3.8+ is installed
- Add Python to PATH
- Use `python3` instead of `python` on Mac/Linux

### Import Errors
```bash
pip install --upgrade -r requirements.txt
```

### File Upload Errors
- File must be CSV, XLSX, or JSON
- Max size: 50MB
- Check required columns in your data

## Next Steps

1. ✅ Install dependencies: `python setup.py`
2. ✅ Start backend: `start.bat` (Windows) or `./start.sh` (Mac/Linux)
3. ✅ Upload test data through the API or web UI
4. ✅ View results in the frontend dashboard
5. 📖 Read [API_GUIDE.md](API_GUIDE.md) for detailed endpoint documentation

## Features Overview

### Dashboard Displays
- **KPIs**: Revenue, customer count, growth rate
- **Trends**: Revenue and customer trends over time
- **RFM Analysis**: Customer segmentation visuals
- **Churn Risk**: At-risk customers identification
- **Recommendations**: Cross-sell/upsell opportunities
- **Anomalies**: Unusual spending patterns

### Real-time Analysis
- Automatic data validation
- Instant insight generation
- ML-powered predictions
- Segmentation and clustering

### Security
- CORS-enabled for frontend integration
- File upload validation
- Size limits (50MB max)
- No data persistence by default

## Support & Documentation

- **README.md** - Full technical documentation
- **API_GUIDE.md** - Complete API reference
- **ml_models.py** - Source code with docstrings
- **sample_data.csv** - Example data format

## Performance Notes

- **Max file size**: 50MB
- **Recommended dataset**: Up to 100,000 transactions
- **Processing time**: Typically < 5 seconds
- **Memory**: ~2GB for large datasets

---

**Backend Ready!** 🎉

Your Python backend with ML models is fully configured and ready to analyze customer data. Connect your frontend and start gaining insights!
