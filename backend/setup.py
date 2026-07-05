#!/usr/bin/env python
"""
Quick setup script for the Customer Analytics Backend
Run this once to install dependencies and verify setup
"""

import os
import sys
import subprocess

def run_command(cmd, description):
    """Run a shell command and report status"""
    print(f"\n{'='*60}")
    print(f"📦 {description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True)
    return result.returncode == 0

def main():
    print("""
╔════════════════════════════════════════════════════════════════╗
║   Customer Analytics Backend - Setup Script                    ║
║   Python ML Models for Customer Intelligence                   ║
╚════════════════════════════════════════════════════════════════╝
    """)
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Python 3.8+ is required")
        sys.exit(1)
    
    print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro} detected")
    
    # Install dependencies
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt", 
                       "Installing dependencies from requirements.txt"):
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    print("✅ Dependencies installed successfully")
    
    # Create uploads directory
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
        print("✅ Created 'uploads' directory")
    
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║   ✅ Setup Complete!                                           ║
╚════════════════════════════════════════════════════════════════╝

Next steps:

1. Start the backend server:
   python app.py

2. Test the API:
   - Health check: http://localhost:5000/health
   - Upload test data: curl -X POST -F "file=@sample_data.csv" \\
     http://localhost:5000/upload

3. Access the dashboard:
   - Open frontend: http://localhost:5173 (or your frontend URL)

📁 Project Structure:
   - app.py              Main Flask application
   - ml_models.py        Machine learning models
   - sample_data.csv     Example data for testing
   - uploads/            Uploaded files storage

📊 Available ML Models:
   - RFM Segmentation     (Customer segmentation)
   - Churn Prediction     (Risk identification)
   - Product Recommender  (Cross-sell/upsell)
   - Anomaly Detection    (Behavior outliers)

🔗 API Endpoints:
   - POST   /upload                 Upload customer data
   - GET    /analyze                Get comprehensive analysis
   - GET    /kpis                   Get KPIs
   - GET    /rfm-segments           Get RFM segments
   - GET    /churn-prediction       Get churn predictions
   - GET    /product-recommendations Get product recommendations

For detailed documentation, see README.md
    """)

if __name__ == '__main__':
    main()
