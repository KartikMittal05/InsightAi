import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from io import BytesIO

from sklearn.ensemble import RandomForestRegressor

import matplotlib

matplotlib.use("Agg")  # Headless backend for server environments
import matplotlib.pyplot as plt
import shap

from ml_models import FeatureEngineer, DataPreprocessor


class ExplainabilityService:
    """Provides global and local explanations using a surrogate tree model and SHAP.

    Approach:
    - Build rich customer-level features via `FeatureEngineer.merge_all_features`.
    - Train a `RandomForestRegressor` to predict `Monetary` from other features.
    - Use `shap.TreeExplainer` for consistent global and local attributions.
    """

    def __init__(self):
        self.model: Optional[RandomForestRegressor] = None
        self.feature_names: Optional[list[str]] = None
        self.background_X: Optional[pd.DataFrame] = None
        self.features_df: Optional[pd.DataFrame] = None

    def _prepare_features(self, data: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
        df = DataPreprocessor.auto_detect_columns(data)
        df = DataPreprocessor.clean_ecommerce_data(df)
        df = DataPreprocessor.calculate_transaction_value(df)

        feats = FeatureEngineer.merge_all_features(df)

        # Target and predictors
        target_col = 'Monetary'
        id_col = 'customer_id'

        # Drop ID and target to form X
        predictors = [c for c in feats.columns if c not in {id_col, target_col}]

        X = feats[predictors].fillna(0)
        y = feats[target_col].astype(float)

        # Persist for later local lookups
        self.features_df = feats[[id_col] + predictors + [target_col]].copy()
        self.feature_names = predictors

        return X, y

    def _ensure_model(self, data: pd.DataFrame):
        """Ensure model is trained with proper validation"""
        # Check if model exists and all required state is present
        model_cached = (self.model is not None and 
                       self.feature_names is not None and 
                       self.features_df is not None)
        
        if model_cached:
            print(f"Using cached model with {len(self.feature_names)} features")
            return

        print("No cached model found, training new model from data...")
        X, y = self._prepare_features(data)
        
        if len(X) < 10:
            raise ValueError("Insufficient data to compute explanations (need >= 10 customers)")
        
        # Check for valid target values
        if y.isna().all() or (y == 0).all():
            raise ValueError("Target variable (Monetary) has no valid values")

        print(f"Training explainability model with {len(X)} samples and {len(self.feature_names)} features...")
        
        # Use fewer estimators for faster training with large datasets
        n_estimators = 100 if len(X) > 1000 else 200
        model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X, y)
        
        r2_score = model.score(X, y)
        print(f"✓ Model trained successfully. R² score: {r2_score:.3f}")

        self.model = model
        self.background_X = X

    def get_global_importance(self, data: pd.DataFrame, top_n: int = 10) -> Dict[str, Any]:
        """Get global feature importance using SHAP values"""
        try:
            self._ensure_model(data)
            X = self.background_X

            print(f"Computing SHAP values for {len(X)} samples...")
            
            # Use a sample for faster computation if dataset is large
            sample_size = min(500, len(X))
            if len(X) > sample_size:
                X_sample = X.sample(n=sample_size, random_state=42)
            else:
                X_sample = X

            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(X_sample)

            # Mean absolute SHAP values across dataset per feature
            mean_abs = np.abs(shap_values).mean(axis=0)
            importances = sorted(
                [
                    {"feature": self._clean_feature_name(self.feature_names[i]), "importance": float(mean_abs[i])}
                    for i in range(len(self.feature_names))
                ],
                key=lambda x: x["importance"],
                reverse=True,
            )

            top = importances[:top_n]
            # Normalize for visualization
            total = sum(v["importance"] for v in top) or 1.0
            for v in top:
                v["weight"] = float(v["importance"] / total)

            print(f"Top features computed: {[f['feature'] for f in top[:5]]}")

            return {
                "top_features": top,
                "feature_count": len(self.feature_names or []),
                "n_samples": int(len(X)),
                "target": "Monetary",
                "method": "shap_tree_explainer",
            }
        except Exception as e:
            print(f"Error computing global importance: {str(e)}")
            raise
    
    def _clean_feature_name(self, feature: str) -> str:
        """Clean feature names for better display"""
        # Common abbreviations and mappings
        replacements = {
            'AOV': 'Avg Order Value',
            'RFM': 'RFM Score',
            'CLV': 'Customer Lifetime Value',
            'Avg_': 'Average ',
            'Min_': 'Minimum ',
            'Max_': 'Maximum ',
            'Total_': 'Total ',
            '_': ' ',
        }
        
        cleaned = feature
        for old, new in replacements.items():
            cleaned = cleaned.replace(old, new)
        
        return cleaned.strip()

    def get_local_explanation(self, data: pd.DataFrame, customer_id: Any, top_n: int = 15) -> Dict[str, Any]:
        self._ensure_model(data)

        id_col = 'customer_id'
        target_col = 'Monetary'

        if self.features_df is None or self.feature_names is None:
            raise ValueError("Features are not prepared")

        row = self.features_df[self.features_df[id_col] == customer_id]
        if row.empty:
            raise ValueError(f"Customer {customer_id} not found in current dataset")

        X_row = row[self.feature_names].fillna(0)
        y_true = float(row[target_col].iloc[0]) if target_col in row.columns else None

        explainer = shap.TreeExplainer(self.model)
        shap_vals = explainer.shap_values(X_row)

        contributions = [
            {"feature": self.feature_names[i], "contribution": float(shap_vals[0, i])}
            for i in range(len(self.feature_names))
        ]
        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        # Model prediction for context
        pred = float(self.model.predict(X_row)[0])

        return {
            "customer_id": customer_id,
            "prediction": pred,
            "actual": y_true,
            "top_contributions": contributions[:top_n],
            "method": "shap_tree_explainer",
            "target": target_col,
        }

    def get_local_plot(self, data: pd.DataFrame, customer_id: Any, plot: str = "waterfall", fmt: str = "png", top_n: int = 15) -> BytesIO:
        """Render a SHAP plot (waterfall|force) for a customer and return a BytesIO image buffer."""
        self._ensure_model(data)

        id_col = 'customer_id'

        if self.features_df is None or self.feature_names is None:
            raise ValueError("Features are not prepared")

        row = self.features_df[self.features_df[id_col] == customer_id]
        if row.empty:
            raise ValueError(f"Customer {customer_id} not found in current dataset")

        X_row = row[self.feature_names].fillna(0)

        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X_row)
        expected_value = explainer.expected_value

        # Build shap Explanation object for plotting
        # shap_values shape: (1, n_features)
        exp = shap.Explanation(
            values=shap_values[0],
            base_values=expected_value if np.ndim(expected_value) == 0 else expected_value[0],
            data=X_row.iloc[0],
            feature_names=self.feature_names,
        )

        plt.close('all')
        
        # Set modern style
        plt.rcParams['font.family'] = 'sans-serif'
        plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica']
        
        if plot == "force":
            fig = plt.figure(figsize=(14, 5), facecolor='white', edgecolor='none')
            shap.plots.force(exp, matplotlib=True, show=False)
            ax = plt.gca()
            ax.set_facecolor('#ffffff')
            fig.patch.set_facecolor('white')
        else:
            # Waterfall plot with custom styling
            fig = plt.figure(figsize=(14, 9), facecolor='white', edgecolor='none')
            
            # Create the waterfall plot
            shap.plots.waterfall(exp, max_display=top_n, show=False)
            
            # Get current axes and apply styling
            ax = plt.gca()
            
            # Set background colors
            ax.set_facecolor('#ffffff')
            fig.patch.set_facecolor('white')
            
            # Enhanced grid
            ax.grid(axis='x', alpha=0.15, linestyle='-', linewidth=0.8, color='#d1d5db')
            ax.set_axisbelow(True)
            
            # Style spines with thicker, darker color
            for spine in ax.spines.values():
                spine.set_visible(True)
                spine.set_color('#e5e7eb')
                spine.set_linewidth(1)
            
            # Make left and bottom spines darker for better definition
            ax.spines['left'].set_color('#9ca3af')
            ax.spines['bottom'].set_color('#9ca3af')
            ax.spines['left'].set_linewidth(1.2)
            ax.spines['bottom'].set_linewidth(1.2)
            
            # Improve tick parameters
            ax.tick_params(axis='x', labelsize=11, colors='#374151', length=5, width=1, direction='out')
            ax.tick_params(axis='y', labelsize=11, colors='#374151', length=5, width=1, direction='out')
            
            # Style tick labels with better readability
            for label in ax.get_xticklabels():
                label.set_fontsize(10)
                label.set_color('#1f2937')
                label.set_fontweight('500')
            
            for label in ax.get_yticklabels():
                label.set_fontsize(11)
                label.set_color('#1f2937')
                label.set_fontweight('500')
            
            # Add axis labels with styling
            ax.set_xlabel('SHAP Value (Impact)', fontsize=12, fontweight='600', color='#1f2937', labelpad=10)
            ax.set_ylabel('Feature', fontsize=12, fontweight='600', color='#1f2937', labelpad=10)
            
            # Add title
            fig.suptitle(
                f'SHAP Waterfall: Customer {customer_id} Monetary Value Breakdown',
                fontsize=15,
                fontweight='bold',
                color='#0f172a',
                y=0.98,
                x=0.5
            )
            
            # Add subtitle
            fig.text(0.5, 0.945, 'How each feature contributes to the predicted customer value',
                    ha='center', fontsize=11, color='#6b7280', style='italic')
            
            # Adjust layout with proper spacing
            plt.tight_layout(rect=[0, 0, 1, 0.93])
            plt.subplots_adjust(top=0.92, bottom=0.08, left=0.12, right=0.95)

        buf = BytesIO()
        plt.savefig(buf, format=fmt, bbox_inches='tight', dpi=120, facecolor='white', edgecolor='none', pad_inches=0.3)
        buf.seek(0)
        plt.close('all')
        return buf
    def generate_business_insights(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Generate actionable business insights from SHAP analysis"""
        try:
            print("Starting business insights generation...")
            
            importance_data = self.get_global_importance(data, top_n=10)
            top_features = importance_data['top_features']
            
            print(f"Top features identified: {[f['feature'] for f in top_features[:5]]}")
            
            insights = []
            
            # Analyze top features and generate insights
            for idx, feature_info in enumerate(top_features[:5], 1):
                feature = feature_info['feature']
                importance = feature_info['importance']
                weight = feature_info.get('weight', 0)
                
                insight = self._generate_insight_for_feature(feature, weight, importance, idx)
                if insight:
                    insights.append(insight)
                    print(f"Generated insight #{idx}: {insight['title']}")
            
            # Generate overall strategic recommendations
            strategy = self._generate_strategic_recommendations(top_features)
            
            print(f"✓ Generated {len(insights)} insights and {len(strategy)} strategic recommendations")
            
            return {
                "insights": insights,
                "strategic_recommendations": strategy,
                "top_drivers": [f['feature'] for f in top_features[:5]],
                "analysis_date": pd.Timestamp.now().isoformat(),
                "sample_size": importance_data['n_samples']
            }
        except Exception as e:
            print(f"Error generating insights: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "insights": [],
                "strategic_recommendations": [],
                "error": str(e)
            }
    
    def _generate_insight_for_feature(self, feature: str, weight: float, importance: float, rank: int) -> Dict[str, Any]:
        """Generate specific insight for a feature - tailored to actual feature characteristics"""
        feature_lower = feature.lower()
        
        # Insight templates based on feature type - check more specific patterns first
        if 'recency' in feature_lower:
            return {
                "rank": rank,
                "title": "Recent Engagement Drives Value",
                "description": f"{feature} explains {weight*100:.1f}% of customer value variation. Customers who purchased recently contribute significantly more revenue.",
                "action": "Implement re-engagement campaigns for customers beyond 30 days since last purchase. Send personalized offers to trigger repeat purchases.",
                "impact": "high",
                "icon": "🔄"
            }
        
        elif 'frequency' in feature_lower:
            return {
                "rank": rank,
                "title": "Purchase Frequency is Critical",
                "description": f"{feature} is the #{rank} driver of customer value. Higher purchase frequency directly correlates with lifetime value.",
                "action": "Launch loyalty programs and subscription models to increase purchase frequency. Offer incentives for repeat purchases within 30 days.",
                "impact": "high",
                "icon": "🔁"
            }
        
        # Differentiate between max/min/avg order values
        elif 'maximum' in feature_lower or 'max' in feature_lower:
            return {
                "rank": rank,
                "title": "Peak Purchase Value Drives CLV",
                "description": f"{feature} ({weight*100:.1f}% importance) shows that customers' highest individual purchase amounts are strong indicators of lifetime value. Peak spenders are your most valuable segment.",
                "action": "Identify and nurture high-value purchase patterns. Create premium tier experiences and exclusive offers for customers showing maximum order potential.",
                "impact": "high",
                "icon": "🎯"
            }
        
        elif 'minimum' in feature_lower or 'min' in feature_lower:
            return {
                "rank": rank,
                "title": "Minimum Order Size Indicator",
                "description": f"{feature} ({weight*100:.1f}% importance) indicates that even a customer's smallest purchases reveal patterns. Lower minimum orders may signal price sensitivity or category preferences.",
                "action": "Develop tiered pricing strategies and entry-level products. Use minimum order patterns to guide product bundling and category recommendations.",
                "impact": "medium",
                "icon": "📊"
            }
        
        elif ('avg' in feature_lower or 'average' in feature_lower or 'aov' in feature_lower) and ('order' in feature_lower or 'value' in feature_lower):
            return {
                "rank": rank,
                "title": "Average Order Value is Key",
                "description": f"{feature} ({weight*100:.1f}% importance) is a primary driver of revenue. Customers with higher average transaction values directly impact profitability.",
                "action": "Implement upselling and cross-selling at checkout. Create volume-based discounts and bundle offers to increase average basket size.",
                "impact": "medium",
                "icon": "💰"
            }
        
        elif 'total' in feature_lower or 'items' in feature_lower or 'transaction' in feature_lower:
            return {
                "rank": rank,
                "title": "Transaction Volume Effect",
                "description": f"{feature} ({weight*100:.1f}% importance) ranks #{rank} in driving customer value. Higher transaction volumes are strong predictors of customer worth.",
                "action": "Encourage repeat purchases with loyalty programs. Implement 'buy more, save more' campaigns and subscription models to increase transaction frequency.",
                "impact": "medium",
                "icon": "📦"
            }
        
        elif 'days' in feature_lower or 'lifespan' in feature_lower or 'tenure' in feature_lower or 'since' in feature_lower:
            return {
                "rank": rank,
                "title": "Customer Longevity Matters",
                "description": f"{feature} ({weight*100:.1f}% importance) shows that customer tenure and lifecycle duration significantly impact value. Longer relationships drive higher CLV.",
                "action": "Focus on retention and lifecycle nurture programs. Implement milestone-based offers and graduated loyalty tiers for established customers.",
                "impact": "high",
                "icon": "⏳"
            }
        
        elif 'variance' in feature_lower or 'deviation' in feature_lower or 'std' in feature_lower:
            return {
                "rank": rank,
                "title": "Purchase Consistency Insight",
                "description": f"{feature} ({weight*100:.1f}% importance) indicates that purchase pattern consistency affects value prediction. Stable buyers show different CLV than volatile ones.",
                "action": "Segment customers by purchase consistency. Target inconsistent buyers with engagement campaigns to stabilize their purchase patterns.",
                "impact": "medium",
                "icon": "📈"
            }
        
        elif 'rate' in feature_lower or 'ratio' in feature_lower or 'coefficient' in feature_lower:
            return {
                "rank": rank,
                "title": "Customer Behavior Rate Analysis",
                "description": f"{feature} ({weight*100:.1f}% importance) measures key customer behavior patterns. This ratio is a significant predictor of customer value.",
                "action": "Analyze the underlying behavior being measured and create targeted interventions. Benchmark customers against peer groups with similar rates.",
                "impact": "medium",
                "icon": "📊"
            }
        
        else:
            # Generic insight for any other features
            return {
                "rank": rank,
                "title": f"{feature} Drives Customer Value",
                "description": f"{feature} contributes {weight*100:.1f}% to customer value prediction. This feature has significant explanatory power in our model.",
                "action": f"Investigate {feature} further in your customer segments. Monitor changes in this metric and adjust strategies accordingly.",
                "impact": "medium",
                "icon": "💡"
            }
    
    def _generate_strategic_recommendations(self, top_features: list) -> list:
        """Generate overall strategic recommendations"""
        recommendations = []
        
        feature_names = [f['feature'].lower() for f in top_features[:5]]
        
        # Check for recency dominance
        if any('recency' in f for f in feature_names[:2]):
            recommendations.append({
                "priority": "Critical",
                "recommendation": "Reduce Customer Churn Risk",
                "rationale": "Recency is a top driver, indicating recent engagement is crucial. Many customers may be at risk of churning.",
                "actions": [
                    "Deploy automated win-back campaigns for customers >45 days inactive",
                    "Implement predictive churn models to identify at-risk customers early",
                    "Create urgency through limited-time offers and flash sales"
                ]
            })
        
        # Check for frequency importance
        if any('frequency' in f for f in feature_names[:3]):
            recommendations.append({
                "priority": "High",
                "recommendation": "Increase Purchase Frequency",
                "rationale": "Transaction frequency drives value. Converting one-time buyers to repeat customers multiplies revenue.",
                "actions": [
                    "Launch subscription or membership programs",
                    "Offer next-purchase discounts within 30-day windows",
                    "Create personalized product recommendation emails based on past purchases"
                ]
            })
        
        # Check for AOV/order value
        if any('aov' in f or 'order' in f or 'value' in f for f in feature_names):
            recommendations.append({
                "priority": "High",
                "recommendation": "Maximize Average Order Value",
                "rationale": "Order size significantly impacts customer lifetime value. Small increases compound over time.",
                "actions": [
                    "Implement 'Frequently Bought Together' bundles",
                    "Set free shipping thresholds at 20% above current AOV",
                    "Deploy tiered loyalty rewards based on order value"
                ]
            })
        
        # General recommendation
        recommendations.append({
            "priority": "Medium",
            "recommendation": "Personalize Customer Experience",
            "rationale": "Top drivers indicate customer behavior patterns vary significantly. One-size-fits-all approaches miss opportunities.",
            "actions": [
                "Segment customers by RFM scores and tailor communications",
                "Use predictive models to recommend products likely to increase value",
                "Test personalized pricing and offers for different segments"
            ]
        })
        
        return recommendations