# 🎯 Customer Analytics Platform

A full-stack web application for customer intelligence and ML-powered insights. Built with React + Flask + scikit-learn.

![Architecture](https://img.shields.io/badge/Frontend-React-blue?style=flat-square) ![Architecture](https://img.shields.io/badge/Backend-Flask-green?style=flat-square) ![Architecture](https://img.shields.io/badge/ML-scikit--learn-orange?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## 📋 Overview

This platform helps businesses understand and predict customer behavior through:
- **RFM Segmentation** - Segment customers by Recency, Frequency, Monetary value
- **Churn Prediction** - Identify at-risk customers before they leave
- **Product Recommendations** - Suggest cross-sell and upsell opportunities
- **Trend Analysis** - Track KPIs and revenue/customer growth
- **Anomaly Detection** - Find unusual spending patterns

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  (Dashboard, Charts, Upload, Analysis)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Flask Backend (Port 5000)                    │
│  - File Upload & Validation                                  │
│  - Data Processing                                           │
│  - API Endpoints                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              ML Models (scikit-learn)                        │
│  ✓ RFM Segmentation       ✓ Product Recommender            │
│  ✓ Churn Prediction       ✓ Anomaly Detection               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (for backend)
- **Node.js 14+** (for frontend)
- **Git** (optional)

### Installation

#### 1. Backend Setup
```bash
cd backend
python install_dependencies.bat
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running the Application

#### Terminal 1: Start Backend
```bash
cd backend
start.bat
```

Backend runs at: `http://localhost:5000`

#### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Test Everything
```bash
# Upload test data
curl -X POST -F "file=@backend/sample_data.csv" http://localhost:5000/upload

# Get analysis
curl http://localhost:5000/analyze
```

## 📁 Project Structure

```
customer-analytics/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Charts.jsx          # Chart components
│   │   │   ├── KPI.jsx             # KPI display
│   │   │   └── Navbar.jsx          # Navigation
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Main dashboard
│   │   │   ├── Home.jsx            # Home page
│   │   │   └── Upload.jsx          # File upload
│   │   ├── context/
│   │   │   └── ThemeContext.jsx    # Theme management
│   │   ├── App.jsx                 # Main app component
│   │   ├── index.css               # Global styles
│   │   └── main.jsx                # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/
│   ├── app.py                      # Flask server
│   ├── ml_models.py                # ML implementations
│   ├── config.py                   # Configuration
│   ├── requirements.txt            # Dependencies
│   ├── setup.py                    # Setup script
│   ├── train_models.py             # Model training
│   ├── start.bat                   # Windows startup
│   ├── start.sh                    # Unix startup
│   ├── install_dependencies.bat    # Dependency installer
│   ├── sample_data.csv             # Test data
│   ├── API_GUIDE.md                # API documentation
│   ├── README.md                   # Backend docs
│   └── uploads/                    # Uploaded files
│
├── QUICKSTART.md                   # Quick start guide
├── BACKEND_SUMMARY.md              # Backend overview
└── README.md                        # This file
```

## 🎯 Features

### Frontend Features
- 📊 **Interactive Dashboard** - Real-time data visualization
- 📈 **Multiple Chart Types** - Pie, bar, line, scatter charts
- 📤 **File Upload** - Drag-and-drop CSV/Excel/JSON support
- 🎨 **Theme Support** - Light/dark mode toggle
- 📱 **Responsive Design** - Works on all devices
- 🚀 **Real-time Updates** - Instant analysis after upload

### Backend Features
- 🔄 **RESTful API** - Easy integration
- 📊 **RFM Segmentation** - Customer lifecycle analysis
- ⚠️ **Churn Prediction** - Risk scoring (0-100)
- 🛍️ **Product Recommendations** - Confidence-based suggestions
- 🔍 **Anomaly Detection** - Outlier identification
- 📁 **Multi-format Support** - CSV, Excel, JSON
- ✅ **Data Validation** - Automatic format checking
- 🔒 **Security** - CORS enabled, file size limits

## 📊 Data Format

Your data should have these columns:

| Column | Type | Required | Example |
|--------|------|----------|---------|
| CustomerID | String | ✅ | C001, C002 |
| PurchaseDate | Date | ✅ | 2024-01-15 |
| Amount | Number | ✅ | 150.00, 85.50 |
| Product | String | ❌ | Coffee Beans |
| Category | String | ❌ | Beverages |
| Quantity | Number | ❌ | 2, 5 |

**Example CSV:**
```csv
CustomerID,PurchaseDate,Amount,Product,Category
C001,2024-01-15,150.00,Coffee Beans,Beverages
C002,2024-01-16,85.50,Headphones,Electronics
C003,2024-01-18,120.00,Planner,Stationery
C001,2024-02-10,200.00,Pour Over Kit,Equipment
```

## 🤖 ML Models

### RFM Segmentation
Segments customers into 4 groups:
- **Champions** (High R, F, M) - Best customers, nurture them
- **Loyal** (Medium-High scores) - Good steady performers
- **At Risk** (Low R) - Declining engagement
- **Low Value** (Low F, M) - Potential to grow

**Metrics Used:**
- Recency (R): Days since last purchase
- Frequency (F): Number of purchases
- Monetary (M): Total spending

### Churn Prediction
Predicts probability of customer churning:
- **Risk Factors:**
  - Days since last purchase (>45 days = warning, >90 days = critical)
  - Purchase frequency (declining trend = risk)
  - Spending consistency (high variance = unstable)
- **Output:** Risk scores 0-100, categorized as Low/Medium/High

### Product Recommender
Suggests products to increase AOV:
- **Algorithm:** Co-occurrence analysis + confidence metrics
- **Output:** Product pairs with confidence and lift scores
- **Use Case:** "Customers who bought X also bought Y"

### Anomaly Detection
Identifies unusual customer behavior:
- **Method:** Z-score analysis (>3σ = anomaly)
- **Detects:** Spending spikes, unusual purchase patterns
- **Output:** Flagged customers with anomaly severity

## 📡 API Endpoints

### Health & Management
```
GET    /health              Check server status
POST   /upload              Upload customer data file
POST   /reset               Clear current data
```

### Analysis
```
GET    /analyze             Complete analysis (KPIs + trends)
GET    /kpis                Key performance indicators
GET    /rfm-segments        Customer segmentation results
GET    /churn-prediction    Churn risk predictions
GET    /product-recommendations  Cross-sell suggestions
```

## 🔧 Configuration

### Environment Variables
Create `.env` file in backend folder:

```
FLASK_ENV=development
FLASK_DEBUG=True
API_URL=http://localhost:5000
MAX_FILE_SIZE=52428800
```

### Frontend Configuration
Edit `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
VITE_THEME=light
```

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - 5-minute quick start guide
- [BACKEND_SUMMARY.md](BACKEND_SUMMARY.md) - Backend overview
- [backend/README.md](backend/README.md) - Full backend documentation
- [backend/API_GUIDE.md](backend/API_GUIDE.md) - Detailed API reference
- [backend/ml_models.py](backend/ml_models.py) - Source code with docstrings

## 🛠 Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Chart.js** - Data visualization
- **Axios** - HTTP client

### Backend
- **Flask 2.3** - Web framework
- **scikit-learn 1.3** - ML library
- **pandas 2.0** - Data processing
- **numpy 1.24** - Numerical computing

## ⚡ Performance

| Operation | Time |
|-----------|------|
| File Upload | <1s |
| Data Validation | <0.5s |
| RFM Analysis | <2s |
| Churn Prediction | <1s |
| Recommendations | <1s |
| **Total Processing** | **<5s** |

**Supported Dataset Sizes:**
- Typical: 1,000 - 100,000 transactions
- Max tested: 500,000+ transactions
- Max file size: 50MB

## 🔒 Security

✅ **Data Handling**
- No data persistence by default
- Uploaded files deleted after processing
- CORS configured for frontend only
- File upload validation

✅ **Input Validation**
- File type checking (CSV, XLSX, JSON)
- Size limits (50MB max)
- Required column verification
- Data format validation

✅ **Production Ready**
- Error handling
- Logging
- Configuration-based security
- Scalable architecture

## 🐛 Troubleshooting

### Backend Issues

**Port 5000 in use:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

**Python not found:**
- Install Python 3.8+
- Add to PATH
- Use `python3` on Mac/Linux

**Import errors:**
```bash
pip install --upgrade -r backend/requirements.txt
```

### Frontend Issues

**Can't reach backend:**
- Ensure backend is running on port 5000
- Check `VITE_API_URL` in .env
- Verify CORS is enabled

**File upload fails:**
- Check file format (CSV/XLSX/JSON)
- Verify file size < 50MB
- Ensure required columns exist

## 📈 Typical Workflow

1. **Prepare Data**
   - Export customer transaction data as CSV
   - Include: CustomerID, PurchaseDate, Amount
   - Optional: Product, Category, Quantity

2. **Upload**
   - Visit `http://localhost:5173`
   - Upload file via drag-and-drop
   - Wait for processing

3. **Analyze**
   - View dashboard KPIs
   - Check customer segmentation
   - Review churn risks
   - See product recommendations

4. **Act**
   - Target champions for VIP programs
   - Reach out to at-risk customers
   - Suggest cross-sell products
   - Investigate anomalies

## 📊 Example Insights

### From RFM Analysis
- "30% of customers are champions generating 45% of revenue"
- "15% at-risk customers have potential $50K recovery opportunity"

### From Churn Prediction
- "42 customers have high churn risk - inactive 90+ days"
- "Average at-risk customer value: $185"

### From Recommendations
- "Coffee beans buyers 72% likely to purchase pour-over kit"
- "Bundle recommendation could increase AOV by $18.30"

## 🎓 Learning Resources

- [scikit-learn Documentation](https://scikit-learn.org/)
- [Flask Mega-Tutorial](https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world)
- [React Official Docs](https://react.dev/)
- [RFM Analysis Guide](https://en.wikipedia.org/wiki/RFM_(customer_value))

## 🤝 Contributing

Want to improve? Feel free to:
- Add new ML models
- Enhance visualization
- Improve documentation
- Submit bug reports

## 📄 License

This project is open source and available under the MIT License.

## 🎉 Get Started Now!

```bash
# 1. Install dependencies
cd backend && python install_dependencies.bat

# 2. Start backend (new terminal)
start.bat

# 3. Start frontend (new terminal)
cd frontend && npm run dev

# 4. Open http://localhost:5173 in browser
# 5. Upload sample_data.csv and explore!
```

---

**Questions or Issues?**
- Check [QUICKSTART.md](QUICKSTART.md)
- Read [backend/API_GUIDE.md](backend/API_GUIDE.md)
- Review source code comments

**Happy analyzing! 🚀📊**
#   I n s i g h t A i  
 