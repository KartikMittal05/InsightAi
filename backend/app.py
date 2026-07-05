from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
from werkzeug.utils import secure_filename
from ml_models import RFMSegmentation, ChurnPrediction, ProductRecommender, DataPreprocessor, FeatureEngineer, AnomalyDetection
from explainability import ExplainabilityService
from report_generator import BusinessInsightsReportGenerator
from schema_validator import DatasetSchemaValidator
from ai_insights import AIInsightsGenerator
from advanced_analytics import AdvancedAnalytics
import os
from datetime import datetime
import json
import io

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'json'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize ML models
rfm_model = RFMSegmentation()
churn_model = ChurnPrediction()
product_recommender = ProductRecommender()
anomaly_model = AnomalyDetection()
explain_service = ExplainabilityService()
ai_insights = AIInsightsGenerator()
advanced_analytics = AdvancedAnalytics()

# Global variable to store current dataset
current_data = None
current_analysis = None
cached_rfm_segments = None
cached_churn_risks = None
cached_recommendations = None
cached_ai_insights = None
current_dataset_type = None

# Auto-load last uploaded dataset on startup
def auto_load_last_dataset():
    """Auto-load the most recently modified dataset from uploads folder"""
    global current_data
    try:
        upload_folder = UPLOAD_FOLDER
        if os.path.exists(upload_folder):
            files = [f for f in os.listdir(upload_folder) if f.endswith(('.csv', '.xlsx'))]
            if files:
                # Get most recently modified file
                latest_file = max(files, key=lambda f: os.path.getmtime(os.path.join(upload_folder, f)))
                filepath = os.path.join(upload_folder, latest_file)
                
                print(f"Auto-loading dataset: {latest_file}")
                if latest_file.endswith('.csv'):
                    df = pd.read_csv(filepath)
                else:
                    df = pd.read_excel(filepath)
                
                current_data = df
                print(f"✓ Auto-loaded {len(df)} rows, {len(df.columns)} columns from {latest_file}")
                return True
    except Exception as e:
        print(f"Could not auto-load dataset: {e}")
    return False

# Try to auto-load data on startup
auto_load_last_dataset()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_dataset_type(df):
    """
    Detect the type of dataset based on column names and characteristics.
    Returns: dict with dataset_type and description
    """
    col_lower = [c.lower() for c in df.columns]
    col_set = set(col_lower)
    
    # Check for Online Retail / E-commerce transaction data FIRST (UCI/Kaggle)
    # Must have MULTIPLE transaction-specific columns to be detected as transaction data
    online_retail_cols = {'invoiceno', 'invoice', 'stockcode', 'description', 'quantity', 
                          'unitprice', 'price', 'invoicedate'}
    matching_online = online_retail_cols.intersection(col_set)
    
    # Transaction data needs at least 4 e-commerce specific columns
    if len(matching_online) >= 4:
        # Determine if it's UCI Online Retail or another e-commerce format
        is_uci_format = 'invoiceno' in col_set or 'invoice' in col_set
        
        if is_uci_format:
            return {
                'type': 'online_retail_transactions',
                'name': 'E-commerce Transaction Data',
                'description': 'Transaction-level e-commerce data (UCI Online Retail compatible)',
                'data_level': 'transaction-level',
                'key_metrics': ['Revenue', 'Transactions', 'Customers', 'Products'],
                'icon': '🏪'
            }
        else:
            return {
                'type': 'ecommerce_transactions',
                'name': 'E-commerce Data',
                'description': 'Transaction-level e-commerce dataset',
                'data_level': 'transaction-level',
                'key_metrics': ['Revenue', 'Transactions', 'Customers', 'Products'],
                'icon': '🛍️'
            }
    
    # Check for Amazon Customer Classification dataset (customer-level)
    # Has both basic and extended feature sets
    amazon_features_basic = {'customerid', 'recency', 'frequency', 'monetary', 'churnflag', 'clv'}
    if amazon_features_basic.issubset(col_set):
        # Check if it's the full 47-feature version
        if len(df.columns) > 20:
            return {
                'type': 'amazon_customer_rfm_full',
                'name': 'Amazon Customer Classification (Full)',
                'description': 'Amazon customer data with 47+ features including demographics, behavior, and segmentation',
                'data_level': 'customer-level',
                'key_metrics': ['CLV', 'RFM Score', 'Churn Flag', 'Loyalty Tier'],
                'icon': '📊'
            }
        else:
            # Standard Amazon RFM dataset
            return {
                'type': 'amazon_customer_rfm',
                'name': 'Amazon Customer RFM',
                'description': 'Amazon customer segmentation data (RFM-based)',
                'data_level': 'customer-level',
                'key_metrics': ['Recency', 'Frequency', 'Monetary', 'CLV'],
                'icon': '🛒'
            }
    
    # Check for pre-aggregated RFM customer data (generic)
    if 'recency' in col_set and 'frequency' in col_set and 'monetary' in col_set:
        return {
            'type': 'rfm_customer_data',
            'name': 'RFM Customer Data',
            'description': 'Pre-aggregated customer segmentation (Recency, Frequency, Monetary)',
            'data_level': 'customer-level',
            'key_metrics': ['Recency', 'Frequency', 'Monetary'],
            'icon': '👥'
        }
    
    # Check for generic customer data
    if 'customer' in ' '.join(col_lower) and 'id' in ' '.join(col_lower):
        return {
            'type': 'customer_data',
            'name': 'Customer Data',
            'description': 'Generic customer dataset',
            'data_level': 'customer-level',
            'key_metrics': ['Customers', 'Segments', 'Value'],
            'icon': '👤'
        }
    
    # Check for transaction/sales data
    if any(col in col_set for col in ['amount', 'revenue', 'total', 'sale', 'transaction']):
        return {
            'type': 'sales_transactions',
            'name': 'Sales Transaction Data',
            'description': 'Transaction or sales dataset',
            'data_level': 'transaction-level',
            'key_metrics': ['Revenue', 'Transactions', 'Customers'],
            'icon': '💰'
        }
    
    # Default fallback
    return {
        'type': 'unknown',
        'name': 'General Dataset',
        'description': 'Dataset type could not be automatically detected',
        'data_level': 'unknown',
        'key_metrics': [],
        'icon': '📁'
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200

@app.route('/', methods=['GET'])
def index():
    """Simple index to avoid 404s when hitting the root URL."""
    return jsonify({
        'message': 'Customer Analytics API',
        'health': '/health',
        'upload': '/upload (POST, multipart/form-data with file)',
        'schema': {
            'validate': '/schema/validate (POST, multipart/form-data with file) - Validate dataset before upload',
            'info': '/schema/info (GET) - Get minimum required columns for datasets'
        },
        'analysis': [
            '/kpis',
            '/analyze',
            '/rfm-segments',
            '/churn-prediction',
            '/product-recommendations'
        ],
        'explainability': [
            '/explain/global',
            '/explain/customer?customer_id=<id>',
            '/explain/customer/plot?customer_id=<id>&plot=waterfall|force&format=png|svg'
        ],
        'downloads': {
            'insights_excel': '/download/insights/excel',
            'insights_csv': '/download/insights/csv',
            'segments_data': '/download/data/segments',
            'trends_data': '/download/data/trends',
            'top_customers': '/download/data/customers'
        },
        'reset': '/reset (POST)'
    }), 200

@app.route('/schema/validate', methods=['POST'])
def validate_schema():
    """Validate dataset against minimum column requirements before upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use CSV, XLSX, or JSON'}), 400
        
        # Read file temporarily for validation
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        
        try:
            if file_ext == 'csv':
                encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
                test_data = None
                for encoding in encodings:
                    try:
                        test_data = pd.read_csv(file.stream, encoding=encoding, nrows=100)
                        file.stream.seek(0)
                        break
                    except:
                        file.stream.seek(0)
                
                if test_data is None:
                    return jsonify({'error': 'Could not read CSV file'}), 400
            elif file_ext == 'xlsx':
                test_data = pd.read_excel(file)
            elif file_ext == 'json':
                test_data = pd.read_json(file)
            
            # Auto-detect columns
            test_data = DataPreprocessor.auto_detect_columns(test_data)
            
            # Validate against schema
            is_valid, validation_result = DatasetSchemaValidator.validate_dataset(test_data)
            
            return jsonify({
                'valid': is_valid,
                'schema_type': validation_result.get('schema_type'),
                'schema_description': validation_result.get('schema_description'),
                'required_columns': validation_result.get('required_columns'),
                'found_columns': validation_result.get('found_columns'),
                'missing_columns': validation_result.get('missing_columns'),
                'extra_columns_count': validation_result.get('extra_columns_count'),
                'total_columns': validation_result.get('total_columns'),
                'rows_count': validation_result.get('rows_count'),
                'message': validation_result.get('message') or validation_result.get('success_message'),
                'bonus_message': validation_result.get('bonus_message'),
                'suggestions': validation_result.get('suggestions', []),
                'error': validation_result.get('error')
            }), 200 if is_valid else 400
        
        except Exception as e:
            return jsonify({'error': f'Failed to read file: {str(e)}'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/schema/info', methods=['GET'])
def get_schema_info():
    """Get information about minimum required columns for datasets"""
    return jsonify({
        'schemas': {
            'transaction_data': {
                'description': 'E-commerce Transaction Data',
                'required_columns': ['customer_id', 'date', 'amount'],
                'notes': 'Either: amount OR (quantity + unit_price)',
                'column_aliases': {
                    'customer_id': ['customerid', 'cust_id', 'customer_number'],
                    'date': ['invoicedate', 'orderdate', 'order_date'],
                    'amount': ['unitprice', 'quantity', 'total', 'price']
                }
            },
            'rfm_customer_data': {
                'description': 'RFM Customer Segmentation Data',
                'required_columns': ['customer_id', 'recency', 'frequency', 'monetary'],
                'notes': 'Pre-aggregated customer-level data',
                'column_aliases': {
                    'customer_id': ['customerid', 'cust_id'],
                    'recency': ['days_since_purchase'],
                    'frequency': ['purchase_count', 'num_purchases'],
                    'monetary': ['clv', 'customer_lifetime_value']
                }
            },
            'universal_minimum': {
                'description': 'Universal Minimum (All Datasets)',
                'required_columns': ['customer_id'],
                'notes': 'Every dataset must have customer_id'
            }
        }
    }), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and perform initial analysis - Supports UCI Online Retail, Kaggle, and standard e-commerce formats"""
    global current_data, current_analysis, cached_rfm_segments, cached_churn_risks, cached_recommendations, cached_ai_insights, current_dataset_type
    
    # Clear all caches including explainability model and AI insights
    cached_rfm_segments = None
    cached_churn_risks = None
    cached_recommendations = None
    cached_ai_insights = None
    current_dataset_type = None
    explain_service.model = None
    explain_service.feature_names = None
    explain_service.features_df = None
    explain_service.background_X = None
    
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use CSV, XLSX, or JSON'}), 400
        
        # Save and process file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Read file based on extension
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        if file_ext == 'csv':
            # Super fast upload - just read first 10k rows
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            current_data = None
            
            print(f"Reading CSV file (max 10k rows for fast processing)...")
            
            for encoding in encodings:
                try:
                    # Always limit to 10k rows for instant upload
                    current_data = pd.read_csv(filepath, encoding=encoding, nrows=10000)
                    print(f"Successfully read {len(current_data)} rows with {encoding} encoding")
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue
                except Exception as e:
                    print(f"Error reading with {encoding}: {e}")
                    continue
            
            if current_data is None:
                return jsonify({'error': 'Could not read CSV file. File encoding is not supported.'}), 400
        elif file_ext == 'xlsx':
            current_data = pd.read_excel(filepath)
        elif file_ext == 'json':
            current_data = pd.read_json(filepath)
        
        # Quick processing only
        total_rows = len(current_data)
        print(f"Processing {total_rows} rows")
        
        # Auto-detect columns (fast operation)
        current_data = DataPreprocessor.auto_detect_columns(current_data)
        
        # ====== SCHEMA VALIDATION - Ensure minimum required columns ======
        print("Validating dataset schema...")
        is_valid, validation_result = DatasetSchemaValidator.validate_dataset(current_data)
        
        if not is_valid:
            print(f"Schema validation failed: {validation_result['error']}")
            return jsonify({
                'error': 'SCHEMA VALIDATION FAILED',
                'message': validation_result['message'],
                'schema_type': validation_result.get('schema_type'),
                'schema_description': validation_result.get('schema_description'),
                'required_columns': validation_result.get('required_columns'),
                'found_columns': validation_result.get('found_columns'),
                'missing_columns': validation_result.get('missing_columns'),
                'suggestions': validation_result.get('suggestions', []),
                'available_columns': current_data.columns.tolist()
            }), 400
        
        print(f"✓ Schema validation passed: {validation_result['success_message']}")
        if 'bonus_message' in validation_result:
            print(f"✓ {validation_result['bonus_message']}")

        # Check if this is customer-level RFM data or transaction-level
        col_lower_list = [c.lower() for c in current_data.columns]
        is_rfm_data = ('recency' in col_lower_list) and ('frequency' in col_lower_list)
        
        if not is_rfm_data:
            # Transaction data: run a light clean to catch empty datasets early
            preview_df = DataPreprocessor.calculate_transaction_value(current_data)
            preview_df = DataPreprocessor.clean_ecommerce_data(preview_df)
            cleaned_rows = len(preview_df)
            if cleaned_rows == 0:
                # Check if the issue is bad dates
                if 'date' in current_data.columns:
                    sample_dates = current_data['date'].head(10).tolist()
                    try:
                        pd.to_datetime(sample_dates, errors='coerce')
                        all_invalid_dates = pd.to_datetime(current_data['date'], errors='coerce').isna().all()
                        if all_invalid_dates:
                            return jsonify({
                                'error': 'No usable rows after cleaning.',
                                'available_columns': current_data.columns.tolist(),
                                'note': f'The date column contains invalid date values. Sample: {sample_dates}',
                                'suggestion': 'Ensure the date column contains valid dates (e.g., 2023-01-15, 01/15/2023, etc.)'
                            }), 400
                    except:
                        pass
                
                return jsonify({
                    'error': 'No usable rows after cleaning.',
                    'available_columns': current_data.columns.tolist(),
                    'note': 'Check for zero/negative amounts or missing customer_id/date values.'
                }), 400
        else:
            # RFM data: just validate customer_id exists
            print(f"Detected pre-aggregated RFM customer data: {len(current_data)} customers")
            cleaned_rows = len(current_data)
            if cleaned_rows == 0:
                return jsonify({
                    'error': 'Dataset is empty.',
                    'available_columns': current_data.columns.tolist()
                }), 400

        # Precompute core analysis so dashboard has real data immediately
        current_analysis = analyze_data(current_data)
        
        # Detect dataset type
        current_dataset_type = detect_dataset_type(current_data)
        print(f"✓ Dataset type detected: {current_dataset_type['name']}")
        print(f"✓ Upload complete! {cleaned_rows} rows remain after cleaning.")
        
        return jsonify({
            'message': 'File uploaded successfully',
            'rows': total_rows,
            'processed_rows': cleaned_rows,
            'columns': current_data.columns.tolist(),
            'dataset_type': current_dataset_type,
            'schema_validation': {
                'status': 'passed',
                'schema_type': validation_result['schema_type'],
                'schema_description': validation_result['schema_description'],
                'required_columns': validation_result['required_columns'],
                'found_columns': validation_result['found_columns'],
                'extra_columns_count': validation_result['extra_columns_count'],
                'message': validation_result.get('success_message')
            },
            'analysis_ready': True,
            'optimized': total_rows > 100000
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dataset-type', methods=['GET'])
def get_dataset_type():
    """Get the type of the currently uploaded dataset"""
    global current_dataset_type
    
    if current_dataset_type is None:
        return jsonify({'error': 'No data uploaded. Please upload a file first.'}), 400
    
    return jsonify(current_dataset_type), 200

@app.route('/analyze', methods=['GET'])
def get_analysis():
    """Return current analysis - Based on UCI Online Retail & Kaggle e-commerce datasets"""
    global current_analysis
    
    if current_analysis is None:
        return jsonify({'error': 'No data uploaded. Please upload a file first.'}), 400
    
    return jsonify(current_analysis), 200

@app.route('/rfm-segments', methods=['GET'])
def get_rfm_segments():
    """Get RFM segmentation analysis - Research-aligned with e-commerce standards"""
    global current_data, cached_rfm_segments
    
    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400
    
    try:
        print("RFM endpoint called...")
        # Use cached results if available
        if cached_rfm_segments is not None:
            print("Returning cached RFM segments")
            return jsonify(cached_rfm_segments), 200
        
        print("Computing RFM segments...")
        segments = rfm_model.fit_predict(current_data)
        summary = rfm_model.get_summary()
        
        result = {
            'segments': segments,
            'summary': summary
        }
        cached_rfm_segments = result
        
        print("RFM segments computed successfully")
        return jsonify(result), 200
    
    except Exception as e:
        print(f"Error in RFM endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/churn-prediction', methods=['GET'])
def predict_churn():
    """Get churn risk prediction"""
    global current_data, cached_churn_risks
    
    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400
    
    try:
        # Use cached results if available
        if cached_churn_risks is not None:
            return jsonify(cached_churn_risks), 200
        
        churn_risks = churn_model.predict(current_data)
        
        result = {
            'churn_risks': churn_risks,
            'high_risk_count': len([x for x in churn_risks if x['risk_level'] == 'High']),
            'medium_risk_count': len([x for x in churn_risks if x['risk_level'] == 'Medium']),
            'low_risk_count': len([x for x in churn_risks if x['risk_level'] == 'Low'])
        }
        cached_churn_risks = result
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/product-recommendations', methods=['GET'])
def get_product_recommendations():
    """Get product recommendations"""
    global current_data, cached_recommendations
    
    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400
    
    try:
        # Use cached results if available
        if cached_recommendations is not None:
            return jsonify(cached_recommendations), 200
        
        recommendations = product_recommender.get_recommendations(current_data)
        
        result = {
            'recommendations': recommendations
        }
        cached_recommendations = result
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/kpis', methods=['GET'])
def get_kpis():
    """Get key performance indicators"""
    global current_data, current_analysis
    
    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400
    
    if current_analysis is None:
        current_analysis = analyze_data(current_data)
    
    return jsonify(current_analysis['kpis']), 200

@app.route('/explain/global', methods=['GET'])
def explain_global():
    """Global feature importance for customer monetary value derived via SHAP."""
    global current_data

    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400

    try:
        result = explain_service.get_global_importance(current_data)
        # Flatten to label:value for simple charting as well
        flat = {item['feature']: item['importance'] for item in result['top_features']}
        return jsonify({'summary': result, 'importances': flat}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/explain/insights', methods=['GET'])
def explain_insights():
    """Get actionable business insights from explainability analysis."""
    global current_data

    if current_data is None:
        print("ERROR: No data uploaded when requesting insights")
        return jsonify({'error': 'No data uploaded'}), 400

    try:
        print(f"Generating insights from {len(current_data)} rows...")
        
        # Force regeneration of insights by clearing model state if needed
        # This ensures fresh insights for each dataset
        if explain_service.model is None:
            print("Model not cached, will train fresh model from uploaded data")
        
        insights = explain_service.generate_business_insights(current_data)
        
        print(f"✓ Successfully generated {len(insights.get('insights', []))} insights")
        return jsonify(insights), 200
    except Exception as e:
        error_msg = f"Failed to generate insights: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg}), 500

@app.route('/explain/customer', methods=['GET'])
def explain_customer():
    """Local explanation for a specific customer via SHAP values."""
    global current_data

    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400

    customer_id = request.args.get('customer_id')
    if customer_id is None:
        return jsonify({'error': 'Missing customer_id query parameter'}), 400

    # Try to coerce to numeric if possible
    try:
        customer_id_cast = int(customer_id)
    except Exception:
        customer_id_cast = customer_id

    try:
        result = explain_service.get_local_explanation(current_data, customer_id_cast)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/explain/customer/plot', methods=['GET'])
def explain_customer_plot():
    """Return a SHAP plot (waterfall or force) for a specific customer as an image."""
    global current_data

    if current_data is None:
        return jsonify({'error': 'No data uploaded'}), 400

    customer_id = request.args.get('customer_id')
    if customer_id is None:
        return jsonify({'error': 'Missing customer_id query parameter'}), 400

    plot = request.args.get('plot', 'waterfall').lower()
    fmt = request.args.get('format', 'png').lower()

    if plot not in {'waterfall', 'force'}:
        return jsonify({'error': 'plot must be waterfall or force'}), 400

    if fmt not in {'png', 'svg'}:
        return jsonify({'error': 'format must be png or svg'}), 400

    try:
        try:
            customer_id_cast = int(customer_id)
        except Exception:
            customer_id_cast = customer_id

        buf = explain_service.get_local_plot(current_data, customer_id_cast, plot=plot, fmt=fmt)
        mimetype = 'image/png' if fmt == 'png' else 'image/svg+xml'
        return send_file(buf, mimetype=mimetype)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def analyze_data(data):
    """Perform comprehensive data analysis - Optimized for e-commerce datasets and RFM data"""
    try:
        print("Starting analysis...")
        df = data.copy()
        
        # Check if this is RFM-level or transaction-level data
        col_lower_list = [c.lower() for c in df.columns]
        is_rfm_data = ('recency' in col_lower_list) and ('frequency' in col_lower_list)
        
        if is_rfm_data:
            print("Analyzing RFM customer-level data...")
            # Direct RFM data: use Recency, Frequency, Monetary
            if 'Recency' not in df.columns:
                df.rename(columns={c: c if c.lower() != 'recency' else 'Recency' for c in df.columns}, inplace=True)
            if 'Frequency' not in df.columns:
                df.rename(columns={c: c if c.lower() != 'frequency' else 'Frequency' for c in df.columns}, inplace=True)
            if 'Monetary' not in df.columns and 'amount' in df.columns:
                df.rename(columns={'amount': 'Monetary'}, inplace=True)
            
            # Use RFM data directly for segmentation
            if 'Monetary' not in df.columns:
                df['Monetary'] = 0
            
            # KPIs from RFM
            total_revenue = float(df['Monetary'].sum())
            total_customers = len(df)
            avg_order_value = float(df['Monetary'].mean())
            growth_rate = 0.0
            
            kpis = {
                'total_revenue': total_revenue,
                'total_customers': total_customers,
                'avg_order_value': avg_order_value,
                'growth_rate': growth_rate
            }
            
            # RFM Segmentation on this data
            df['Segment'] = df.apply(rfm_model._assign_segment, axis=1)
            segment_counts = {str(k): int(v) for k, v in df['Segment'].value_counts().to_dict().items()}
            revenue_by_segment = {str(k): float(v) for k, v in df.groupby('Segment')['Monetary'].sum().to_dict().items()}
            
            # For RFM data, we can't derive trends/behavior without dates, so use defaults
            behavior_labels = ['High Value', 'Medium Value', 'Low Value']
            behavior_values = [len(df[df['Monetary'] > df['Monetary'].quantile(0.66)]),
                              len(df[(df['Monetary'] > df['Monetary'].quantile(0.33)) & (df['Monetary'] <= df['Monetary'].quantile(0.66))]),
                              len(df[df['Monetary'] <= df['Monetary'].quantile(0.33)])]
            
            lifecycle_labels = ['Champions', 'Loyal', 'At Risk', 'Hibernating', 'Potential']
            segment_list = df['Segment'].value_counts().to_dict()
            lifecycle_values = [
                int(segment_list.get('Champions', 0)),
                int(segment_list.get('Loyal', 0)),
                int(segment_list.get('At Risk', 0)),
                int(segment_list.get('Hibernating', 0)),
                int(segment_list.get('Potential', 0))
            ]
            
            rfm_customers = df.nlargest(200, 'Monetary')[['Frequency', 'Monetary']].to_dict('records')
            
            trend_labels = []
            revenue_trend = []
            customer_trend = []
        
        else:
            # Transaction-level data: perform full analysis
            print("Cleaning data...")
            df = DataPreprocessor.clean_ecommerce_data(df)
            df = DataPreprocessor.calculate_transaction_value(df)
            
            # Ensure date is datetime
            if df['date'].dtype != 'datetime64[ns]':
                df['date'] = pd.to_datetime(df['date'], errors='coerce')
                df = df[df['date'].notna()]
            
            print(f"Analyzing {len(df)} rows...")
            
            # Calculate KPIs
            total_revenue = float(df['amount'].sum())
            total_customers = int(df['customer_id'].nunique())
            avg_order_value = float(df['amount'].mean())
            
            # Revenue growth
            df_sorted = df.sort_values('date')
            monthly_revenue = df_sorted.groupby(df_sorted['date'].dt.to_period('M'))['amount'].sum()
            if len(monthly_revenue) > 1:
                latest_revenue = float(monthly_revenue.iloc[-1])
                previous_revenue = float(monthly_revenue.iloc[-2])
                if previous_revenue > 0:
                    growth_rate = float(((latest_revenue - previous_revenue) / previous_revenue) * 100)
                else:
                    growth_rate = 0.0
            else:
                growth_rate = 0.0
            
            kpis = {
                'total_revenue': total_revenue,
                'total_customers': total_customers,
                'avg_order_value': avg_order_value,
                'growth_rate': growth_rate
            }
            
            # Trends
            monthly_data = df_sorted.groupby(df_sorted['date'].dt.to_period('M')).agg({
                'amount': 'sum',
                'customer_id': 'nunique'
            }).reset_index()
            
            monthly_data['date'] = monthly_data['date'].astype(str)
            
            if len(monthly_data) > 12:
                monthly_data = monthly_data.tail(12)
            
            trend_labels = monthly_data['date'].tolist()
            revenue_trend = [float(x) for x in monthly_data['amount'].tolist()]
            customer_trend = [int(x) for x in monthly_data['customer_id'].tolist()]
            
            # Behavior: weekday vs weekend
            weekday_mask = df_sorted['date'].dt.dayofweek
            weekday_count = int((weekday_mask < 5).sum())
            weekend_count = int((weekday_mask >= 5).sum())
            behavior_labels = ['Weekday', 'Weekend']
            behavior_values = [weekday_count, weekend_count]

            # Lifecycle buckets
            reference_date = df_sorted['date'].max()
            last_purchase = df_sorted.groupby('customer_id')['date'].max()
            days_since = (reference_date - last_purchase).dt.days
            lifecycle_bins = {
                'New': days_since <= 30,
                'Active': (days_since > 30) & (days_since <= 90),
                'At Risk': (days_since > 90) & (days_since <= 150),
                'Churn': days_since > 150,
            }
            lifecycle_labels = list(lifecycle_bins.keys()) + ['Reactivated']
            lifecycle_values = [int(mask.sum()) for mask in lifecycle_bins.values()]
            recent_cutoff = reference_date - pd.Timedelta(days=14)
            reactivated = int(((last_purchase < reference_date - pd.Timedelta(days=60)) & (last_purchase >= recent_cutoff)).sum())
            lifecycle_values.append(reactivated)

            # RFM features
            rfm = FeatureEngineer.create_rfm_features(df, reference_date=reference_date)
            if not rfm.empty:
                rfm['Segment'] = rfm.apply(rfm_model._assign_segment, axis=1)
                segment_counts = {str(k): int(v) for k, v in rfm['Segment'].value_counts().to_dict().items()}
                revenue_by_segment = {str(k): float(v) for k, v in rfm.groupby('Segment')['Monetary'].sum().to_dict().items()}
                rfm_customers = rfm.nlargest(200, 'Monetary')[['Frequency', 'Monetary']].to_dict('records')
            else:
                segment_counts = {}
                revenue_by_segment = {}
                rfm_customers = []
        
        return {
            'kpis': kpis,
            'trends': {
                'labels': trend_labels,
                'revenue_trend': revenue_trend,
                'customer_trend': customer_trend
            },
            'segment_counts': segment_counts,
            'revenue_by_segment': revenue_by_segment,
            'behavior_labels': behavior_labels,
            'behavior_values': behavior_values,
            'lifecycle_labels': lifecycle_labels,
            'lifecycle_values': lifecycle_values,
            'rfm_customers': rfm_customers
        }
    
    except Exception as e:
        print(f"Error in analyze_data: {str(e)}")
        return {
            'kpis': {
                'total_revenue': 0,
                'total_customers': 0,
                'avg_order_value': 0,
                'growth_rate': 0
            },
            'trends': {
                'labels': [],
                'revenue_trend': [],
                'customer_trend': []
            },
            'error': str(e)
        }

@app.route('/download/insights/excel', methods=['GET'])
def download_insights_excel():
    """Download business insights as Excel file"""
    global current_analysis, current_dataset_type
    
    if current_analysis is None:
        return jsonify({'error': 'No analysis available. Please upload and analyze data first.'}), 400
    
    try:
        # Generate Excel report
        excel_file = BusinessInsightsReportGenerator.generate_excel_report(
            current_analysis, 
            current_dataset_type
        )
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'Business_Insights_{timestamp}.xlsx'
        
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate Excel report: {str(e)}'}), 500

@app.route('/download/insights/csv', methods=['GET'])
def download_insights_csv():
    """Download business insights summary as CSV file"""
    global current_analysis
    
    if current_analysis is None:
        return jsonify({'error': 'No analysis available. Please upload and analyze data first.'}), 400
    
    try:
        # Generate CSV summary
        csv_content = BusinessInsightsReportGenerator.generate_csv_summary(current_analysis)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'Business_Insights_Summary_{timestamp}.csv'
        
        return send_file(
            io.BytesIO(csv_content.encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate CSV report: {str(e)}'}), 500

@app.route('/download/data/segments', methods=['GET'])
def download_segments():
    """Download RFM segment analysis as CSV"""
    global current_analysis
    
    if current_analysis is None:
        return jsonify({'error': 'No analysis available. Please upload and analyze data first.'}), 400
    
    try:
        segment_counts = current_analysis.get('segment_counts', {})
        revenue_by_segment = current_analysis.get('revenue_by_segment', {})
        
        # Create DataFrame from segment data
        segments_data = {
            'Segment': [],
            'Customer_Count': [],
            'Total_Revenue': []
        }
        
        for segment in segment_counts.keys():
            segments_data['Segment'].append(segment)
            segments_data['Customer_Count'].append(segment_counts.get(segment, 0))
            segments_data['Total_Revenue'].append(revenue_by_segment.get(segment, 0))
        
        df = pd.DataFrame(segments_data)
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'Customer_Segments_{timestamp}.csv'
        
        return send_file(
            io.BytesIO(csv_buffer.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate segments report: {str(e)}'}), 500

@app.route('/download/data/trends', methods=['GET'])
def download_trends():
    """Download monthly trends as CSV"""
    global current_analysis
    
    if current_analysis is None:
        return jsonify({'error': 'No analysis available. Please upload and analyze data first.'}), 400
    
    try:
        trends = current_analysis.get('trends', {})
        
        trends_data = {
            'Month': trends.get('labels', []),
            'Revenue': trends.get('revenue_trend', []),
            'Unique_Customers': trends.get('customer_trend', [])
        }
        
        df = pd.DataFrame(trends_data)
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'Monthly_Trends_{timestamp}.csv'
        
        return send_file(
            io.BytesIO(csv_buffer.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate trends report: {str(e)}'}), 500

@app.route('/download/data/customers', methods=['GET'])
def download_top_customers():
    """Download top customers (by monetary value) as CSV"""
    global current_analysis
    
    if current_analysis is None:
        return jsonify({'error': 'No analysis available. Please upload and analyze data first.'}), 400
    
    try:
        rfm_customers = current_analysis.get('rfm_customers', [])
        
        if not rfm_customers:
            return jsonify({'error': 'No customer data available for download.'}), 400
        
        df = pd.DataFrame(rfm_customers)
        
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'Top_Customers_{timestamp}.csv'
        
        return send_file(
            io.BytesIO(csv_buffer.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate customers report: {str(e)}'}), 500

@app.route('/ai-insights', methods=['GET'])
def get_ai_insights():
    """Get AI-powered business insights and recommendations"""
    global current_data, current_analysis, rfm_model, cached_ai_insights
    
    if current_data is None:
        return jsonify({'error': 'No data uploaded. Please upload a dataset first.'}), 400
    
    try:
        # Use cached result if available
        if cached_ai_insights is not None:
            print("Returning cached AI insights")
            return jsonify(cached_ai_insights), 200
        
        print("Generating fresh AI insights...")
        df = current_data.copy()
        df = DataPreprocessor.auto_detect_columns(df)
        print(f"After preprocessing: columns = {list(df.columns)}")

        # Ensure we have RFM segments
        if 'Segment' not in df.columns:
            print("Segment column not found, attempting to generate...")
            # Generate RFM segments if missing
            if all(col in df.columns for col in ['Recency', 'Frequency', 'Monetary']):
                print("Using existing RFM columns")
                df['Segment'] = df.apply(rfm_model._assign_segment, axis=1)
            # Build RFM from transaction data if possible
            elif all(col in df.columns for col in ['date', 'customer_id']):
                print("Building RFM from transaction data")
                df = DataPreprocessor.clean_ecommerce_data(df)
                df = DataPreprocessor.calculate_transaction_value(df)
                rfm_df = FeatureEngineer.create_rfm_features(df)
                rfm_df['Segment'] = rfm_df.apply(rfm_model._assign_segment, axis=1)
                df = rfm_df
            else:
                error_msg = f"Dataset needs Recency/Frequency/Monetary or transaction columns (date, customer_id). Found columns: {list(df.columns)}"
                print(f"ERROR: {error_msg}")
                return jsonify({'error': error_msg}), 400
        
        print(f"Segment column exists. Unique segments: {df['Segment'].unique().tolist()}")
        
        # Generate all AI insights
        print("Generating summary KPIs...")
        summary_kpis = ai_insights.generate_summary_kpis(df)
        print(f"Summary KPIs: {summary_kpis}")
        
        print("Generating segment metrics...")
        segment_metrics = ai_insights.generate_segment_metrics(df)
        print(f"Segment metrics count: {len(segment_metrics)}")
        
        print("Calculating feature importance...")
        feature_importance = ai_insights.calculate_feature_importance(df)
        print(f"Feature importance keys: {list(feature_importance.keys())}")
        
        print("Generating feature insights...")
        feature_insights = ai_insights.generate_feature_insights(feature_importance)
        print(f"Feature insights count: {len(feature_insights)}")
        
        print("Generating business insights...")
        business_insights = ai_insights.generate_segment_insights(df, df['Segment'].unique())
        print(f"Business insights count: {len(business_insights)}")
        
        print("Generating strategic recommendations...")
        strategic_recommendations = ai_insights.generate_strategic_recommendations(
            df,
            segment_metrics,
            summary_kpis,
            feature_insights,
        )
        print(f"Strategic recommendations count: {len(strategic_recommendations)}")
        
        print("Generating growth signals...")
        growth_signals = ai_insights.generate_growth_signals(df, segment_metrics, summary_kpis)
        print(f"Growth signals count: {len(growth_signals)}")
        
        print("Generating model info...")
        model_info = ai_insights.generate_model_info()
        
        result = {
            'summary_kpis': summary_kpis,
            'segment_metrics': segment_metrics,
            'feature_importance': feature_importance,
            'feature_insights': feature_insights,
            'business_insights': business_insights,
            'strategic_recommendations': strategic_recommendations,
            'growth_signals': growth_signals,
            'model_info': model_info
        }
        
        # Cache the result for subsequent calls
        cached_ai_insights = result
        print("✓ AI insights generated successfully and cached")
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate AI insights: {str(e)}'}), 500

@app.route('/power-bi-analytics', methods=['GET'])
def get_power_bi_analytics():
    """Get Power BI-style advanced analytics"""
    global current_data, cached_rfm_segments
    
    print(f"DEBUG: /power-bi-analytics called")
    print(f"DEBUG: current_data is None: {current_data is None}")
    
    if current_data is None:
        return jsonify({'error': 'No data uploaded. Please upload a dataset first.'}), 400
    
    try:
        # Get RFM segments data which has the Segment column
        if cached_rfm_segments is None:
            # Generate RFM segments if not cached
            print("DEBUG: Generating RFM segments...")
            rfm_results = rfm_model.fit_predict(current_data)
            cached_rfm_segments = rfm_results
        
        # Use the customers data from RFM segmentation which has Segment column
        if 'customers' in cached_rfm_segments:
            df = pd.DataFrame(cached_rfm_segments['customers'])
            print(f"DEBUG: Using RFM customers data: {len(df)} rows")
            print(f"DEBUG: Columns: {list(df.columns)}")
            print(f"DEBUG: Segments: {df['Segment'].value_counts().to_dict() if 'Segment' in df.columns else 'No Segment column'}")
        else:
            df = current_data.copy()
            print(f"DEBUG: Using current_data: {df.shape}")
            
            # Add RFM segments if not present
            if 'Segment' not in df.columns:
                print("DEBUG: Adding Segment column...")
                if 'Recency' in df.columns and 'Frequency' in df.columns and 'Monetary' in df.columns:
                    print("DEBUG: Found RFM columns, assigning segments...")
                    df['Segment'] = df.apply(rfm_model._assign_segment, axis=1)
                    print(f"DEBUG: Segments added: {df['Segment'].value_counts().to_dict()}")
                else:
                    print("DEBUG: Could not find RFM columns to create segments")
        
        # Generate comprehensive Power BI-style analytics
        print("DEBUG: Calling generate_comprehensive_dashboard_data...")
        dashboard_data = advanced_analytics.generate_comprehensive_dashboard_data(df)
        print(f"DEBUG: Dashboard data keys: {list(dashboard_data.keys())}")
        print(f"DEBUG: Performance matrix items: {len(dashboard_data.get('performance_matrix', []))}")
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        print(f"Error generating Power BI analytics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate Power BI analytics: {str(e)}'}), 500

@app.route('/reset', methods=['POST'])
def reset_data():
    """Clear current data"""
    global current_data, current_analysis, cached_ai_insights
    current_data = None
    current_analysis = None
    cached_ai_insights = None
    
    return jsonify({'message': 'Data cleared successfully'}), 200

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 50MB'}), 413

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
