import numpy as np
import pandas as pd

from ml_models import DataPreprocessor


class AdvancedAnalytics:
    """Generate Power BI-style analytics from a customer dataset."""

    def __init__(self):
        pass

    def generate_comprehensive_dashboard_data(self, df: pd.DataFrame) -> dict:
        data = df.copy()
        data = DataPreprocessor.auto_detect_columns(data)

        customer_col = self._get_column(data, ["customer_id", "customerid", "customer id", "cust_id", "custid"])
        segment_col = self._get_column(data, ["segment", "segments", "customer_segment"])
        monetary_col = self._get_column(data, ["Monetary", "monetary", "amount", "revenue", "sales", "total_spent"])
        recency_col = self._get_column(data, ["Recency", "recency"])
        frequency_col = self._get_column(data, ["Frequency", "frequency"])
        date_col = self._get_column(data, ["date", "Date", "InvoiceDate", "OrderDate", "purchase_date", "order_date"])

        total_customers = int(data[customer_col].nunique()) if customer_col else int(len(data))
        total_revenue = float(data[monetary_col].fillna(0).sum()) if monetary_col else 0.0
        avg_order_value = float(data[monetary_col].fillna(0).mean()) if monetary_col else 0.0

        metrics = {
            "total_customers": total_customers,
            "total_revenue": round(total_revenue, 2),
            "avg_order_value": round(avg_order_value, 2),
        }

        performance_matrix = self._build_performance_matrix(
            data,
            segment_col=segment_col,
            monetary_col=monetary_col,
            recency_col=recency_col,
            frequency_col=frequency_col,
        )

        trends = self._build_trends(data, date_col, monetary_col, customer_col)

        segment_distribution = []
        if segment_col:
            counts = data[segment_col].value_counts(dropna=False)
            total = counts.sum() or 1
            segment_distribution = [
                {
                    "segment": str(seg),
                    "count": int(count),
                    "percentage": round(float(count) / float(total) * 100, 2),
                }
                for seg, count in counts.items()
            ]

        return {
            "metrics": metrics,
            "performance_matrix": performance_matrix,
            "trends": trends,
            "segment_distribution": segment_distribution,
        }

    def _build_performance_matrix(self, data, segment_col=None, monetary_col=None, recency_col=None, frequency_col=None):
        if segment_col and segment_col in data.columns:
            grouped = data.groupby(segment_col)
            matrix = []
            for segment, group in grouped:
                matrix.append({
                    "segment": str(segment),
                    "customer_count": int(len(group)),
                    "avg_recency": float(group[recency_col].mean()) if recency_col else None,
                    "avg_frequency": float(group[frequency_col].mean()) if frequency_col else None,
                    "avg_monetary": float(group[monetary_col].mean()) if monetary_col else None,
                })
            return matrix

        if monetary_col and monetary_col in data.columns:
            quantiles = data[monetary_col].quantile([0.2, 0.8]).values
            low = data[data[monetary_col] <= quantiles[0]]
            mid = data[(data[monetary_col] > quantiles[0]) & (data[monetary_col] <= quantiles[1])]
            high = data[data[monetary_col] > quantiles[1]]
            buckets = [("Bottom 20%", low), ("Middle 60%", mid), ("Top 20%", high)]
            matrix = []
            for name, group in buckets:
                matrix.append({
                    "segment": name,
                    "customer_count": int(len(group)),
                    "avg_recency": float(group[recency_col].mean()) if recency_col else None,
                    "avg_frequency": float(group[frequency_col].mean()) if frequency_col else None,
                    "avg_monetary": float(group[monetary_col].mean()) if monetary_col else None,
                })
            return matrix

        return []

    def _build_trends(self, data, date_col, monetary_col, customer_col):
        if not date_col or date_col not in data.columns:
            return {
                "labels": [],
                "revenue_trend": [],
                "customer_trend": [],
            }

        data = data.copy()
        data[date_col] = pd.to_datetime(data[date_col], errors="coerce")
        data = data[data[date_col].notna()]
        if data.empty:
            return {
                "labels": [],
                "revenue_trend": [],
                "customer_trend": [],
            }

        data["month"] = data[date_col].dt.to_period("M").astype(str)
        grouped = data.groupby("month")

        revenue = grouped[monetary_col].sum() if monetary_col else pd.Series([0] * len(grouped))
        customers = grouped[customer_col].nunique() if customer_col else grouped.size()

        return {
            "labels": list(revenue.index),
            "revenue_trend": [float(v) for v in revenue.values],
            "customer_trend": [int(v) for v in customers.values],
        }

    def _get_column(self, df: pd.DataFrame, candidates: list[str]) -> str | None:
        df_cols = {c.lower(): c for c in df.columns}
        for candidate in candidates:
            if candidate.lower() in df_cols:
                return df_cols[candidate.lower()]
        return None
