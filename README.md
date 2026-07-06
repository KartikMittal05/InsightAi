# InsightAI — Customer Analytics Platform

InsightAI is an end-to-end customer analytics platform for e-commerce businesses. It turns raw transaction data (CSV, Excel, or JSON) into actionable insights through customer segmentation, churn risk prediction, product recommendations, and anomaly detection — all served through a Flask API and visualized in a React dashboard.

The project integrates four core analytics modules:

- **RFM Segmentation** — K-Means clustering on Recency, Frequency, and Monetary value to group customers into segments like Champions, Loyal, At Risk, and Low Value.
- **Churn Prediction** — A weighted risk-scoring engine that flags customers likely to churn, with Low/Medium/High risk levels.
- **Product Recommendations** — Co-occurrence-based cross-sell and upsell suggestions, with confidence and lift metrics.
- **Anomaly Detection** — Isolation Forest and statistical (Z-score) methods to surface unusual spending behavior.

It also includes an **explainability layer** (SHAP) for global and per-customer model interpretation, and a report generator for exporting results.

## Demo Video

A walkthrough of the platform in action — data upload, RFM segmentation, churn prediction, recommendations, and the anomaly dashboard.

## Tech Stack

**Backend**
- Python, Flask, Flask-CORS
- pandas, numpy, scikit-learn, joblib
- SHAP (explainability)
- matplotlib, reportlab, Pillow (reporting/plots)

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Chart.js (react-chartjs-2)
- Axios, React Router

## Project Structure

```
InsightAi/
├── backend/
│   ├── app.py                  # Main Flask API
│   ├── ml_models.py             # RFM, churn, recommendation, anomaly models
│   ├── advanced_analytics.py
│   ├── ai_insights.py
│   ├── explainability.py        # SHAP-based explainability
│   ├── report_generator.py
│   ├── schema_validator.py
│   ├── security.py
│   ├── config.py
│   ├── train_models.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── Customer_Analytics_Dashboard.ipynb   # Exploratory notebook
├── RESEARCH_PAPER.md                     # Accompanying research paper
├── QUICKSTART.md
├── SETUP_AND_RUN.md
└── RUN_STEPS.txt
```

## Prerequisites

- Python 3.8+
- Node.js 16+ and npm

## Getting Started

### 1. Backend setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API will start on **http://localhost:5000**.

### 2. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will start on **http://localhost:5173** (or the URL shown in your terminal).

### 3. Use the app

1. Open the frontend URL in your browser.
2. Upload a CSV/Excel/JSON file, or use the provided sample data.
3. View the generated dashboard: KPIs, RFM segments, churn risk, recommendations, and anomalies.

### Quick health check

```bash
curl http://localhost:5000/health
```

## Data Format

Upload a file with the following columns:

```csv
CustomerID,PurchaseDate,Amount,Product,Category
C001,2024-01-15,150.00,Coffee Beans,Beverages
C002,2024-01-16,85.50,Headphones,Electronics
```

**Required:** `CustomerID`, `PurchaseDate` (YYYY-MM-DD), `Amount`
**Optional:** `Product`, `Category`, `Quantity`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload customer transaction data |
| GET | `/analyze` | Get comprehensive analysis |
| GET | `/kpis` | Get key performance metrics |
| GET | `/rfm-segments` | Get RFM segmentation results |
| GET | `/churn-prediction` | Get churn risk predictions |
| GET | `/product-recommendations` | Get cross-sell/upsell recommendations |
| GET | `/explain/global` | Global feature importance (SHAP) |
| GET | `/explain/customer?customer_id=X` | Per-customer explanation (SHAP) |
| POST | `/reset` | Clear currently loaded data |

## Environment Variables

Backend (`.env`, optional):

```
FLASK_ENV=development
FLASK_DEBUG=True
API_URL=http://localhost:5000
MAX_FILE_SIZE=52428800
```

Frontend (`.env.local`):

```
VITE_API_URL=http://localhost:5000
```

## Documentation

- [`QUICKSTART.md`](./QUICKSTART.md) — fast setup and API testing guide
- [`SETUP_AND_RUN.md`](./SETUP_AND_RUN.md) — detailed backend/frontend connection setup
- [`RESEARCH_PAPER.md`](./RESEARCH_PAPER.md) — the accompanying research write-up on the platform's methodology and results
- [`Customer_Analytics_Dashboard.ipynb`](./Customer_Analytics_Dashboard.ipynb) — exploratory notebook

## Notes

- Max upload size: 50MB (recommended up to ~100,000 transactions).
- No data persistence by default — uploaded data is processed in-memory per session.
- CORS is enabled on the backend for local frontend development.

## License

No license file is currently included in this repository. Add one (e.g. MIT) if you intend for others to reuse this code.
