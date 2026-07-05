"""
ML Model Training and Evaluation Script

Run this script to train models on your data and evaluate performance.
"""

import pandas as pd
import numpy as np
from ml_models import RFMSegmentation, ChurnPrediction, ProductRecommender, AnomalyDetection
import json

def load_sample_data():
    """Load sample data for demonstration"""
    try:
        data = pd.read_csv('sample_data.csv')
        print(f"✅ Loaded {len(data)} records from sample_data.csv")
        return data
    except FileNotFoundError:
        print("❌ sample_data.csv not found")
        return None

def train_models(data):
    """Train all models"""
    print("\n" + "="*60)
    print("🤖 Training Machine Learning Models")
    print("="*60)
    
    # RFM Segmentation
    print("\n1️⃣  RFM Segmentation Model")
    print("-" * 40)
    rfm_model = RFMSegmentation()
    rfm_results = rfm_model.fit_predict(data)
    print(f"   ✅ Segmented {len(rfm_results.get('customers', []))} customers")
    print(f"   📊 Segments: {rfm_results.get('segment_counts', {})}")
    
    # Churn Prediction
    print("\n2️⃣  Churn Prediction Model")
    print("-" * 40)
    churn_model = ChurnPrediction()
    churn_results = churn_model.predict(data)
    
    high_risk = len([x for x in churn_results if x['risk_level'] == 'High'])
    medium_risk = len([x for x in churn_results if x['risk_level'] == 'Medium'])
    low_risk = len([x for x in churn_results if x['risk_level'] == 'Low'])
    
    print(f"   ✅ Analyzed {len(churn_results)} customers")
    print(f"   ⚠️  High Risk: {high_risk} | Medium Risk: {medium_risk} | Low Risk: {low_risk}")
    
    if churn_results:
        top_risk = sorted(churn_results, key=lambda x: x['risk_score'], reverse=True)[0]
        print(f"   🔴 Top Risk: {top_risk['CustomerID']} (Score: {top_risk['risk_score']:.1f})")
    
    # Product Recommendations
    print("\n3️⃣  Product Recommendation Model")
    print("-" * 40)
    recommender = ProductRecommender()
    recommendations = recommender.get_recommendations(data)
    print(f"   ✅ Generated {len(recommendations)} recommendations")
    
    if recommendations:
        for i, rec in enumerate(recommendations[:3], 1):
            print(f"   {i}. {rec['from_product']} → {rec['to_product']}")
            print(f"      Confidence: {rec['confidence']*100:.1f}% | Lift: {rec['lift']:.2f}x")
    
    # Anomaly Detection
    print("\n4️⃣  Anomaly Detection Model")
    print("-" * 40)
    anomalies = AnomalyDetection.detect_anomalies(data)
    print(f"   ✅ Detected {len(anomalies)} anomalies")
    
    if anomalies:
        for i, anomaly in enumerate(anomalies[:3], 1):
            print(f"   {i}. {anomaly['CustomerID']}: {anomaly['anomaly_type']}")
    
    return {
        'rfm': rfm_results,
        'churn': churn_results,
        'recommendations': recommendations,
        'anomalies': anomalies
    }

def save_results(results, filename='model_results.json'):
    """Save model results to file"""
    try:
        # Convert to JSON-serializable format
        serializable_results = {
            'rfm': results['rfm'],
            'churn': results['churn'],
            'recommendations': results['recommendations'],
            'anomalies': results['anomalies']
        }
        
        with open(filename, 'w') as f:
            json.dump(serializable_results, f, indent=2)
        
        print(f"\n✅ Results saved to {filename}")
    except Exception as e:
        print(f"❌ Error saving results: {str(e)}")

def main():
    print("""
╔════════════════════════════════════════════════════════════════╗
║   ML Model Training & Evaluation                               ║
║   Customer Analytics Backend                                  ║
╚════════════════════════════════════════════════════════════════╝
    """)
    
    # Load data
    data = load_sample_data()
    if data is None:
        return
    
    # Train models
    results = train_models(data)
    
    # Save results
    save_results(results)
    
    print("\n" + "="*60)
    print("✅ Model Training Complete!")
    print("="*60)
    print("\n💡 Next steps:")
    print("   1. Start the backend: python app.py")
    print("   2. Upload your data through the API or web interface")
    print("   3. View predictions and recommendations in the dashboard")
    print("\n📖 See README.md for detailed API documentation")

if __name__ == '__main__':
    main()
