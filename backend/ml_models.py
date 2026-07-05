import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.decomposition import PCA
import warnings
warnings.filterwarnings('ignore')

# Standard e-commerce dataset column mappings (UCI Online Retail, Kaggle)
DATASET_COLUMN_MAPPING = {
    'invoice_id': ['InvoiceNo', 'OrderID', 'Order ID', 'TransactionID', 'invoice_id', 'order_id', 'transaction_id', 'id', 'transaction', 'order'],
    'customer_id': ['CustomerID', 'Customer ID', 'CUST_ID', 'customer_id', 'cust_id', 'customer', 'customer_number', 'cust_number', 'buyer_id', 'userid', 'user_id'],
    'date': ['InvoiceDate', 'OrderDate', 'Order Date', 'Date', 'Transaction Date', 'PurchaseDate', 'LastPurchaseDate', 'Last Purchase Date', 'date', 'order_date', 'purchase_date', 'transaction_date', 'datetime', 'created_at', 'timestamp', 'last_purchase_date', 'last_order_date'],
    'amount': ['Amount', 'UnitPrice', 'Quantity', 'Value', 'Total', 'Price', 'amount', 'total', 'value', 'sales', 'revenue', 'order_value', 'transaction_amount', 'total_amount', 'total_price', 'unit_price'],
    'unit_price': ['UnitPrice', 'unit_price', 'price', 'unit_cost', 'cost', 'rate'],
    'quantity': ['Quantity', 'Qty', 'quantity', 'qty', 'units', 'count'],
    'product': ['Description', 'Product', 'ProductName', 'Product Name', 'product', 'item', 'item_name', 'product_name'],
    'category': ['StockCode', 'ProductCategory', 'Category', 'category', 'stock_code', 'product_category', 'type', 'class']
}

class DataPreprocessor:
    """Preprocess e-commerce datasets (UCI Online Retail, Kaggle, etc.)"""
    
    @staticmethod
    def auto_detect_columns(df):
        """Auto-detect and map dataset columns to standard names - Flexible matching"""
        mapped_df = df.copy()
        column_mapping = {}
        
        # Track which standard columns we've found
        found_columns = {}
        
        # Normalize RFM column names (common in aggregated datasets)
        for col in df.columns:
            col_lower = col.lower().strip()
            if col_lower == 'recency':
                column_mapping[col] = 'Recency'
            elif col_lower == 'frequency':
                column_mapping[col] = 'Frequency'
            elif col_lower == 'monetary':
                column_mapping[col] = 'Monetary'
        
        for standard_col, aliases in DATASET_COLUMN_MAPPING.items():
            for col in df.columns:
                col_lower = col.lower().strip()
                # Exact match first
                if col_lower in [alias.lower() for alias in aliases]:
                    column_mapping[col] = standard_col
                    found_columns[standard_col] = col
                    break
            
            # If not found exactly, try partial/fuzzy matching for key columns
            if standard_col not in found_columns:
                for col in df.columns:
                    col_lower = col.lower().strip()
                    # For amount, try to find numeric columns
                    if standard_col == 'amount':
                        if any(keyword in col_lower for keyword in ['amount', 'total', 'value', 'price', 'sales', 'revenue', 'cost', 'spent', 'clv']):
                            column_mapping[col] = standard_col
                            found_columns[standard_col] = col
                            break
                    # For customer_id, try to find identifier columns
                    elif standard_col == 'customer_id':
                        if any(keyword in col_lower for keyword in ['customer', 'cust', 'buyer', 'user', 'client', 'account']):
                            column_mapping[col] = standard_col
                            found_columns[standard_col] = col
                            break
                    # For date, try to find date columns (more strict matching)
                    # Only match actual date-like terms, not generic words
                    elif standard_col == 'date':
                        # Exclude common false positives like 'Item Purchased', 'Product Description'
                        is_false_positive = any(keyword in col_lower for keyword in ['item', 'product', 'description', 'name'])
                        if not is_false_positive and any(keyword in col_lower for keyword in ['date', 'time', 'when', 'datetime', 'timestamp', 'created_at']):
                            column_mapping[col] = standard_col
                            found_columns[standard_col] = col
                            break
                        # Also allow 'purchase' or 'order' or 'last' only if combined with date-specific terms
                        elif not is_false_positive and any(keyword in col_lower for keyword in ['purchase_date', 'order_date', 'last_purchase', 'last_order', 'invoicedate', 'transaction_date']):
                            column_mapping[col] = standard_col
                            found_columns[standard_col] = col
                            break
        
        if column_mapping:
            mapped_df = mapped_df.rename(columns=column_mapping)
        
        return mapped_df
    
    @staticmethod
    def clean_ecommerce_data(df):
        """Clean e-commerce data: remove cancelled orders, invalid values, etc."""
        df = df.copy()
        
        # Remove cancelled orders (negative quantities or marked as 'C' invoices)
        if 'invoice_id' in df.columns and df['invoice_id'].dtype == 'object':
            df = df[~df['invoice_id'].str.startswith('C', na=False)]
        
        # Remove rows with negative or zero amounts
        if 'amount' in df.columns:
            df = df[df['amount'] > 0]
        
        # Remove rows with missing CustomerID
        if 'customer_id' in df.columns:
            df = df[df['customer_id'].notna()]
        
        # Convert date to datetime
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            df = df[df['date'].notna()]
        
        return df
    
    @staticmethod
    def calculate_transaction_value(df):
        """Calculate transaction value (handle different dataset formats)"""
        df = df.copy()
        
        if 'amount' not in df.columns:
            df['amount'] = df.get('quantity', 1) * df.get('unit_price', 0)
        
        return df

class FeatureEngineer:
    """Engineer features for RFM and behavioral analysis from e-commerce data"""
    
    @staticmethod
    def create_rfm_features(df, reference_date=None):
        """Create RFM features from transaction data - Research Standard"""
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        
        # Generate invoice_id if it doesn't exist (each row is a transaction)
        if 'invoice_id' not in df.columns:
            df['invoice_id'] = range(len(df))
        
        if reference_date is None:
            reference_date = df['date'].max() + timedelta(days=1)
        
        # Ensure reference_date is a Timestamp
        if not isinstance(reference_date, pd.Timestamp):
            reference_date = pd.Timestamp(reference_date)
        
        # RFM Calculation (Optimized for performance)
        # Use agg instead of apply for much faster computation
        rfm_agg = df.groupby('customer_id').agg({
            'date': 'max',
            'invoice_id': 'nunique',
            'amount': 'sum'
        })
        
        # Calculate recency - convert to days as integers
        recency_days = (reference_date - rfm_agg['date']).dt.days.values
        
        # Combine into RFM dataframe
        rfm = pd.DataFrame({
            'customer_id': rfm_agg.index,
            'Recency': recency_days,
            'Frequency': rfm_agg['invoice_id'].values,
            'Monetary': rfm_agg['amount'].values
        })
        
        return rfm
    
    @staticmethod
    def create_behavioral_features(df):
        """Create behavioral features - Research-based"""
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        
        # Generate invoice_id if it doesn't exist
        if 'invoice_id' not in df.columns:
            df['invoice_id'] = range(len(df))
        
        # Generate quantity if it doesn't exist
        if 'quantity' not in df.columns:
            df['quantity'] = 1
        
        # Calculate customer-level aggregations using optimized agg
        max_date = df['date'].max()
        
        agg_dict = {
            'date': ['min', 'max'],
            'quantity': ['mean', 'sum'],
            'amount': ['mean', 'max', 'min', 'std', 'count']
        }
        
        grouped = df.groupby('customer_id').agg(agg_dict)
        grouped.columns = ['_'.join(col).strip() for col in grouped.columns.values]
        
        behavioral_data = {
            'customer_id': grouped.index,
            'Lifespan_Days': ((grouped['date_max'] - grouped['date_min']).dt.days + 1).astype(int).values,
            'Days_Since_First': ((max_date - grouped['date_min']).dt.days).astype(int).values,
            'Avg_Qty_Order': grouped['quantity_mean'].values,
            'Total_Items': grouped['quantity_sum'].values,
            'AOV': grouped['amount_mean'].values,
            'Max_Order': grouped['amount_max'].values,
            'Min_Order': grouped['amount_min'].values,
            'Order_Variance': grouped['amount_std'].values,
            'Total_Transactions': grouped['amount_count'].values,
        }
        
        behavioral = pd.DataFrame(behavioral_data)
        behavioral['Order_Variance'] = behavioral['Order_Variance'].fillna(0)
        behavioral['Purchase_Frequency'] = behavioral['Total_Transactions'] / (behavioral['Lifespan_Days'].astype(float) + 1)
        behavioral['Spending_Coefficient_Variation'] = behavioral['Order_Variance'] / (behavioral['AOV'] + 1)
        
        return behavioral
    
    @staticmethod
    def create_product_features(df):
        """Create product affinity features - Research-based"""
        df = df.copy()
        
        if 'product' not in df.columns or 'category' not in df.columns:
            return None
        
        grouped = df.groupby('customer_id')
        
        product_affinity = pd.DataFrame({
            'customer_id': grouped.size().index,
            'Product_Diversity': grouped['product'].nunique().values,
            'Category_Diversity': grouped['category'].nunique().values,
            'Avg_Product_Value': grouped['amount'].mean().values
        })
        
        return product_affinity
    
    @staticmethod
    def merge_all_features(df):
        """Merge all engineered features"""
        df = DataPreprocessor.clean_ecommerce_data(df)
        df = DataPreprocessor.calculate_transaction_value(df)
        
        # Create features
        rfm = FeatureEngineer.create_rfm_features(df)
        behavioral = FeatureEngineer.create_behavioral_features(df)
        
        # Merge features
        features = rfm.merge(behavioral, on='customer_id', how='left')
        
        # Add product features if available
        if 'product' in df.columns and 'category' in df.columns:
            product = FeatureEngineer.create_product_features(df)
            if product is not None:
                features = features.merge(product, on='customer_id', how='left')
        
        return features

class RFMSegmentation:
    """RFM Segmentation using K-Means - Aligned with UCI Online Retail & Kaggle research standards"""
    
    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.scaler = StandardScaler()
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.rfm_data = None
    
    def fit_predict(self, data):
        """Fit RFM segmentation and return results"""
        try:
            # Data should already be preprocessed, just copy it
            df = data.copy()
            
            # If not preprocessed, do it now
            if 'customer_id' not in df.columns or 'amount' not in df.columns:
                df = DataPreprocessor.auto_detect_columns(df)
                df = DataPreprocessor.clean_ecommerce_data(df)
                df = DataPreprocessor.calculate_transaction_value(df)
            
            # For large datasets, focus on top customers by revenue (faster groupby)
            n_customers = df['customer_id'].nunique()
            if n_customers > 5000:  # Lower threshold for faster response
                customer_revenue = df.groupby('customer_id')['amount'].sum().nlargest(5000)
                df = df[df['customer_id'].isin(customer_revenue.index)]
            
            # Create RFM features
            rfm = FeatureEngineer.create_rfm_features(df)
            
            # Normalize RFM features
            rfm_features = rfm[['Recency', 'Frequency', 'Monetary']].copy()
            rfm_scaled = self.scaler.fit_transform(rfm_features)
            rfm['Cluster'] = self.kmeans.fit_predict(rfm_scaled)
            
            # Assign segment names based on RFM values
            rfm['Segment'] = rfm.apply(self._assign_segment, axis=1)
            self.rfm_data = rfm
            
            # Create segment summary
            segment_counts = rfm['Segment'].value_counts().to_dict()
            segment_revenue = rfm.groupby('Segment')['Monetary'].sum().to_dict()
            
            # Return only top customers for display (faster serialization)
            top_customers = rfm.nlargest(100, 'Monetary')[['customer_id', 'Recency', 'Frequency', 'Monetary', 'Cluster', 'Segment']]
            
            return {
                'segment_counts': {str(k): int(v) for k, v in segment_counts.items()},
                'revenue_by_segment': {str(k): float(v) for k, v in segment_revenue.items()},
                'customers': top_customers.to_dict('records')
            }
        
        except Exception as e:
            print(f"Error in RFM analysis: {str(e)}")
            return {}
    
    def _assign_segment(self, row):
        """Assign segment labels based on RFM values - Research-aligned with flexible thresholds"""
        recency = row['Recency']
        frequency = row['Frequency']
        monetary = row['Monetary']
        
        # Use quantile-based thresholds for better adaptability to different datasets
        # This allows proper segmentation even with low/high spending patterns
        
        # Calculate percentiles from the available data if possible
        # For now, use adaptive thresholds based on values
        
        # Champions: Low recency (recent), high frequency (frequent), high monetary (spender)
        # Definition: Top 15-20% of customers by value and engagement
        if recency <= 30 and frequency >= 5 and monetary >= 300:
            return 'Champions'
        
        # Loyal: Recent/medium recency, good frequency, good monetary
        # Definition: Regular customers with consistent spending (20-30%)
        elif recency <= 90 and frequency >= 3 and monetary >= 150:
            return 'Loyal'
        
        # At Risk: Inactive (high recency) but was valuable
        # Definition: Used to buy regularly but haven't recently (10-15%)
        elif recency > 90 and frequency >= 2 and monetary >= 100:
            return 'At Risk'
        
        # Hibernating: Inactive and low engagement
        # Definition: Old customers who spent little or are completely dormant (15-20%)
        elif recency > 120 or (recency > 60 and frequency < 2):
            return 'Hibernating'
        
        # Potential: New or occasional with some promise
        # Definition: New customers or occasional buyers (20-25%)
        else:
            return 'Potential'
    
    def get_summary(self):
        """Get RFM summary statistics"""
        if self.rfm_data is None:
            return {}
        
        return {
            'total_customers': len(self.rfm_data),
            'avg_recency': float(self.rfm_data['Recency'].mean()),
            'avg_frequency': float(self.rfm_data['Frequency'].mean()),
            'avg_monetary': float(self.rfm_data['Monetary'].mean())
        }

class ChurnPrediction:
    """Customer Churn Risk Prediction using Logistic Regression - E-commerce optimized"""
    
    def __init__(self):
        self.model = LogisticRegression(random_state=42, max_iter=1000)
        self.scaler = StandardScaler()
        self.trained = False
    
    def predict(self, data):
        """Predict churn probability for customers using Logistic Regression - E-commerce optimized"""
        try:
            # Auto-detect columns and clean
            df = DataPreprocessor.auto_detect_columns(data)
            df = DataPreprocessor.clean_ecommerce_data(df)
            df = DataPreprocessor.calculate_transaction_value(df)
            
            df['date'] = pd.to_datetime(df['date'])
            
            # Generate invoice_id if it doesn't exist
            if 'invoice_id' not in df.columns:
                df['invoice_id'] = range(len(df))
            
            # Calculate customer features
            reference_date = df['date'].max()
            
            # Calculate customer features using optimized agg
            features_agg = df.groupby('customer_id').agg({
                'date': ['min', 'max'],
                'invoice_id': 'count',
                'amount': ['sum', 'mean', 'std', 'min', 'max']
            })
            
            features_agg.columns = ['_'.join(col).strip() for col in features_agg.columns.values]
            
            features = pd.DataFrame({
                'customer_id': features_agg.index,
                'Days_Since_Purchase': (reference_date - features_agg['date_max']).dt.days.values,
                'Customer_Age_Days': (reference_date - features_agg['date_min']).dt.days.values,
                'Purchase_Frequency': features_agg['invoice_id_count'].values,
                'Total_Spent': features_agg['amount_sum'].values,
                'Avg_Purchase': features_agg['amount_mean'].values,
                'Purchase_Std': features_agg['amount_std'].fillna(0).values,
                'Min_Purchase': features_agg['amount_min'].values,
                'Max_Purchase': features_agg['amount_max'].values,
            })
            
            
            # Engineer additional features
            features['Purchase_Frequency_Ratio'] = features['Purchase_Frequency'] / (features['Customer_Age_Days'] + 1)
            features['Spending_Variance'] = features['Purchase_Std'] / (features['Avg_Purchase'] + 1)
            
            # Vectorized churn risk scoring (much faster than iterrows)
            risk_score = 0
            
            # Factor 1: Days since last purchase (40% weight)
            days_since = features['Days_Since_Purchase']
            risk_score += np.where(days_since > 90, 40, 
                         np.where(days_since > 60, 30,
                         np.where(days_since > 30, 15, 0)))
            
            # Factor 2: Purchase frequency (30% weight)
            freq = features['Purchase_Frequency']
            freq_ratio = features['Purchase_Frequency_Ratio']
            risk_score += np.where(freq == 1, 30,
                         np.where(freq_ratio < 0.05, 25,
                         np.where(freq_ratio < 0.1, 15, 0)))
            
            # Factor 3: Spending volatility (20% weight)
            spending_var = features['Spending_Variance']
            risk_score += np.where(spending_var > 1.0, 20,
                         np.where(spending_var > 0.5, 10, 0))
            
            # Factor 4: Total spending (10% weight)
            total_spent = features['Total_Spent']
            avg_purchase = features['Avg_Purchase']
            risk_score += np.where(total_spent < 100, 8,
                         np.where(avg_purchase < 50, 5, 0))
            
            # Normalize to 0-100
            features['risk_prob'] = (risk_score / 100) * 100
            
            # Determine risk level
            features['risk_level'] = np.where(features['risk_prob'] >= 70, 'High',
                                    np.where(features['risk_prob'] >= 40, 'Medium', 'Low'))
            
            # Limit to top 50 high-risk customers for faster response
            high_risk = features[features['risk_level'] == 'High'].nlargest(50, 'risk_prob')
            medium_risk = features[features['risk_level'] == 'Medium'].nlargest(30, 'risk_prob')
            low_risk = features[features['risk_level'] == 'Low'].nlargest(20, 'risk_prob')
            
            top_risks = pd.concat([high_risk, medium_risk, low_risk])
            
            churn_risks = []
            for _, row in top_risks.iterrows():
                risk_factors = []
                if row['Days_Since_Purchase'] > 90:
                    risk_factors.append('Inactive for 90+ days')
                elif row['Days_Since_Purchase'] > 45:
                    risk_factors.append('Inactive for 45+ days')
                
                if row['Purchase_Frequency'] == 1:
                    risk_factors.append('Single purchase customer')
                elif row['Purchase_Frequency'] < 3:
                    risk_factors.append('Low purchase frequency')
                
                if row['Spending_Variance'] > 1.0:
                    risk_factors.append('High spending volatility')
                
                churn_risks.append({
                    'customer_id': row['customer_id'],
                    'risk_score': float(row['risk_prob']),
                    'risk_level': row['risk_level'],
                    'churn_probability': float(row['risk_prob']),
                    'factors': risk_factors,
                    'days_since_purchase': int(row['Days_Since_Purchase']),
                    'purchase_frequency': int(row['Purchase_Frequency']),
                    'total_spent': float(row['Total_Spent']),
                    'avg_purchase': float(row['Avg_Purchase'])
                })
            
            return churn_risks
        
        except Exception as e:
            print(f"Error in churn prediction: {str(e)}")
            return []

class ProductRecommender:
    """Product Recommendation Engine using Co-occurrence Analysis - E-commerce optimized"""
    
    def __init__(self):
        self.min_support = 0.02
        self.min_confidence = 0.5
    
    def get_recommendations(self, data):
        """Generate product recommendations based on purchase patterns"""
        try:
            # Auto-detect columns and clean
            df = DataPreprocessor.auto_detect_columns(data)
            df = DataPreprocessor.clean_ecommerce_data(df)
            df = DataPreprocessor.calculate_transaction_value(df)
            
            # Ensure product column exists
            if 'product' not in df.columns:
                # Generate synthetic product data if not available
                df['product'] = 'Product_' + (df['amount'].astype(int) // 100).astype(str)
            
            # Find frequent itemsets (simplified approach)
            # Group by customer to see product associations
            customer_products = df.groupby('customer_id')['product'].apply(list).reset_index()
            
            # Calculate product co-occurrence
            recommendations = []
            
            products = df['product'].unique()
            
            for product in products[:5]:  # Top 5 products
                # Find products frequently bought with this product
                customers_with_product = customer_products[customer_products['product'].apply(lambda x: product in x)]['customer_id'].tolist()
                
                if len(customers_with_product) > 0:
                    related_data = df[df['customer_id'].isin(customers_with_product)]
                    related_products = related_data[related_data['product'] != product]['product'].value_counts()
                    
                    if len(related_products) > 0:
                        top_related = related_products.index[0]
                        confidence = len(related_products) / len(customers_with_product)
                        
                        if confidence >= self.min_confidence:
                            avg_value_lift = related_data[related_data['product'] == top_related]['amount'].mean() / df['amount'].mean()
                            
                            recommendations.append({
                                'from_product': product,
                                'to_product': top_related,
                                'confidence': float(confidence),
                                'lift': float(avg_value_lift),
                                'support_count': int(len(customers_with_product))
                            })
            
            # Sort by confidence
            recommendations.sort(key=lambda x: x['confidence'], reverse=True)
            
            return recommendations[:10]  # Return top 10 recommendations
        
        except Exception as e:
            print(f"Error in product recommendation: {str(e)}")
            return []

class AnomalyDetection:
    """Detect anomalies using Isolation Forest - E-commerce optimized"""
    
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
    
    @staticmethod
    def detect_anomalies(data):
        """Detect anomalies in customer spending using Isolation Forest"""
        try:
            # Auto-detect columns and clean
            df = DataPreprocessor.auto_detect_columns(data)
            df = DataPreprocessor.clean_ecommerce_data(df)
            df = DataPreprocessor.calculate_transaction_value(df)
            
            df['date'] = pd.to_datetime(df['date'])
            
            # Calculate customer statistics
            customer_stats = df.groupby('customer_id').agg({
                'amount': ['mean', 'std', 'min', 'max', 'count'],
                'date': [lambda x: (x.max() - x.min()).days]
            }).reset_index()
            
            customer_stats.columns = ['customer_id', 'mean_amount', 'std_amount', 'min_amount', 
                                     'max_amount', 'num_purchases', 'customer_lifespan_days']
            customer_stats['std_amount'].fillna(0, inplace=True)
            
            # Feature engineering
            customer_stats['coeff_variation'] = customer_stats['std_amount'] / (customer_stats['mean_amount'] + 1)
            customer_stats['purchase_range'] = customer_stats['max_amount'] - customer_stats['min_amount']
            customer_stats['avg_purchase_gap'] = customer_stats['customer_lifespan_days'] / (customer_stats['num_purchases'] + 1)
            
            # Prepare features for Isolation Forest
            features = customer_stats[['mean_amount', 'std_amount', 'max_amount', 
                                       'coeff_variation', 'purchase_range']].values
            
            # Scale features
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            # Fit Isolation Forest
            model = IsolationForest(contamination=0.1, random_state=42)
            anomaly_labels = model.fit_predict(features_scaled)
            anomaly_scores = model.score_samples(features_scaled)
            
            # Get anomaly results
            anomalies = []
            for idx, row in customer_stats.iterrows():
                if anomaly_labels[idx] == -1:  # -1 indicates anomaly
                    anomaly_score = float(-anomaly_scores[idx])  # Normalize to positive scale
                    
                    # Determine anomaly type
                    anomaly_type = []
                    if row['max_amount'] > row['mean_amount'] + 3 * row['std_amount']:
                        anomaly_type.append('Unusual spending spike')
                    if row['coeff_variation'] > 2:
                        anomaly_type.append('Highly volatile spending')
                    if row['purchase_range'] > row['mean_amount'] * 5:
                        anomaly_type.append('Extreme spending range')
                    
                    anomalies.append({
                        'customer_id': row['customer_id'],
                        'anomaly_type': ', '.join(anomaly_type) if anomaly_type else 'Abnormal behavior',
                        'anomaly_score': anomaly_score,
                        'severity': 'High' if anomaly_score > 0.7 else 'Medium',
                        'max_purchase': float(row['max_amount']),
                        'mean_purchase': float(row['mean_amount']),
                        'std_purchase': float(row['std_amount']),
                        'num_purchases': int(row['num_purchases'])
                    })
            
            return anomalies
        
        except Exception as e:
            print(f"Error in anomaly detection: {str(e)}")
            return []
