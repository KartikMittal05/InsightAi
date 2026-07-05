"""
Dataset Schema Validator
Defines minimum required columns for different dataset types and validates uploads
"""

from typing import Dict, List, Tuple, Optional
import pandas as pd


class DatasetSchemaValidator:
    """
    Validates that uploaded datasets meet minimum column requirements.
    Supports multiple dataset types with different minimum column requirements.
    """
    
    # Minimum required columns for each dataset type
    MINIMUM_SCHEMAS = {
        'transaction_data': {
            'required_columns': ['customer_id', 'date', 'amount'],
            'description': 'E-commerce Transaction Data',
            'column_aliases': {
                'customer_id': ['customerid', 'cust_id', 'customer_number', 'buyer_id', 'userid'],
                'date': ['invoicedate', 'orderdate', 'order_date', 'purchase_date', 'transaction_date'],
                'amount': ['unitprice', 'quantity', 'total', 'price', 'revenue', 'sales', 'order_value']
            },
            'notes': 'Either: amount OR (quantity + unit_price) can fulfill amount requirement'
        },
        'rfm_customer_data': {
            'required_columns': ['customer_id', 'recency', 'frequency', 'monetary'],
            'description': 'RFM Customer Segmentation Data',
            'column_aliases': {
                'customer_id': ['customerid', 'cust_id', 'customer_number'],
                'recency': ['days_since_purchase', 'days_since_last_purchase'],
                'frequency': ['purchase_count', 'num_purchases', 'transaction_count'],
                'monetary': ['clv', 'customer_lifetime_value', 'total_spent', 'revenue', 'sales']
            },
            'notes': 'Pre-aggregated customer-level data'
        },
        'universal_minimum': {
            'required_columns': ['customer_id'],
            'description': 'Universal Minimum (All Datasets)',
            'column_aliases': {
                'customer_id': ['customerid', 'cust_id', 'customer_number', 'buyer_id', 'userid', 'user_id']
            },
            'notes': 'Every dataset must have at least customer_id'
        }
    }
    
    @staticmethod
    def get_schema_for_dataset(df: pd.DataFrame) -> Tuple[str, Dict]:
        """
        Determine which schema applies to the dataset based on column detection
        """
        col_lower = [c.lower() for c in df.columns]
        col_set = set(col_lower)
        
        # Check for RFM data (highest priority - most specific)
        if all(col in col_set for col in ['recency', 'frequency', 'monetary']):
            return 'rfm_customer_data', DatasetSchemaValidator.MINIMUM_SCHEMAS['rfm_customer_data']
        
        # Check for transaction data
        has_date = any(col in col_set for col in ['invoicedate', 'orderdate', 'order_date', 'purchase_date', 'transaction_date', 'date'])
        has_amount = any(col in col_set for col in ['amount', 'unitprice', 'price', 'total', 'revenue', 'sales', 'order_value'])
        has_qty = any(col in col_set for col in ['quantity', 'qty', 'units'])
        has_unit_price = any(col in col_set for col in ['unitprice', 'unit_price', 'price'])
        
        if has_date and (has_amount or (has_qty and has_unit_price)):
            return 'transaction_data', DatasetSchemaValidator.MINIMUM_SCHEMAS['transaction_data']
        
        # Default to universal minimum
        return 'unknown', DatasetSchemaValidator.MINIMUM_SCHEMAS['universal_minimum']
    
    @staticmethod
    def validate_dataset(df: pd.DataFrame, schema_type: Optional[str] = None) -> Tuple[bool, Dict]:
        """
        Validate dataset against minimum schema requirements
        
        Returns:
            Tuple[bool, Dict]: (is_valid, validation_result)
            - is_valid: True if dataset meets minimum requirements
            - validation_result: Dict with details about validation
        """
        if df is None or len(df) == 0:
            return False, {
                'valid': False,
                'error': 'Dataset is empty',
                'message': 'Please upload a dataset with at least 1 row of data'
            }
        
        # Detect schema if not provided
        if schema_type is None:
            schema_type, schema = DatasetSchemaValidator.get_schema_for_dataset(df)
        else:
            if schema_type not in DatasetSchemaValidator.MINIMUM_SCHEMAS:
                return False, {
                    'valid': False,
                    'error': 'Invalid schema type',
                    'message': f'Schema type "{schema_type}" not recognized'
                }
            schema = DatasetSchemaValidator.MINIMUM_SCHEMAS[schema_type]
        
        # Get normalized column names
        col_lower = {c.lower(): c for c in df.columns}
        
        # Check minimum required columns
        missing_columns = []
        found_columns = {}
        
        for required_col in schema['required_columns']:
            # Check exact match first
            if required_col in col_lower:
                found_columns[required_col] = col_lower[required_col]
            else:
                # Check aliases
                aliases = schema['column_aliases'].get(required_col, [])
                found = False
                
                for alias in aliases:
                    if alias in col_lower:
                        found_columns[required_col] = col_lower[alias]
                        found = True
                        break
                
                # Special case: amount can be derived from quantity * unit_price
                if not found and required_col == 'amount':
                    has_qty = any(alias in col_lower for alias in schema['column_aliases'].get('quantity', ['quantity']))
                    has_unit_price = any(alias in col_lower for alias in schema['column_aliases'].get('unit_price', ['unit_price', 'unitprice', 'price']))
                    
                    if has_qty and has_unit_price:
                        found_columns['amount'] = 'DERIVED: quantity × unit_price'
                        found = True
                
                if not found:
                    missing_columns.append({
                        'column': required_col,
                        'aliases': schema['column_aliases'].get(required_col, []),
                        'notes': 'Could be derived from quantity × unit_price' if required_col == 'amount' else None
                    })
        
        # Prepare result
        result = {
            'valid': len(missing_columns) == 0,
            'schema_type': schema_type,
            'schema_description': schema['description'],
            'rows_count': len(df),
            'total_columns': len(df.columns),
            'required_columns': schema['required_columns'],
            'found_columns': found_columns,
            'missing_columns': missing_columns,
            'extra_columns': [c for c in df.columns if c.lower() not in col_lower or col_lower[c.lower()] == c],
            'extra_columns_count': len(df.columns) - len(schema['required_columns'])
        }
        
        if not result['valid']:
            result['error'] = 'Missing Required Columns'
            result['message'] = f"Dataset is missing {len(missing_columns)} required column(s) for {schema['description']}: {', '.join([m['column'] for m in missing_columns])}"
            result['suggestions'] = DatasetSchemaValidator._generate_suggestions(schema_type, missing_columns)
        else:
            result['success_message'] = f"✓ Dataset meets minimum requirements for {schema['description']}"
            if result['extra_columns_count'] > 0:
                result['bonus_message'] = f"✓ Additional {result['extra_columns_count']} column(s) detected - will provide enhanced insights!"
        
        return result['valid'], result
    
    @staticmethod
    def _generate_suggestions(schema_type: str, missing_columns: List[Dict]) -> List[str]:
        """Generate helpful suggestions based on missing columns"""
        suggestions = []
        
        for missing in missing_columns:
            col = missing['column']
            aliases = missing['aliases']
            
            if col == 'customer_id':
                suggestions.append(f"Rename your customer identifier column to one of: {', '.join(aliases)}")
            
            elif col == 'date':
                suggestions.append(f"Add a date column. Try renaming to one of: {', '.join(aliases)}")
            
            elif col == 'amount':
                suggestions.append(f"Add 'amount' column OR provide both 'quantity' and 'unit_price' to calculate it")
            
            elif col == 'recency':
                suggestions.append(f"Add 'recency' (days since last purchase) or rename from: {', '.join(aliases)}")
            
            elif col == 'frequency':
                suggestions.append(f"Add 'frequency' (number of purchases) or rename from: {', '.join(aliases)}")
            
            elif col == 'monetary':
                suggestions.append(f"Add 'monetary' (customer lifetime value) or rename from: {', '.join(aliases)}")
        
        return suggestions
    
    @staticmethod
    def get_all_valid_column_names(schema_type: str = None) -> Dict[str, List[str]]:
        """Get all valid column name variations for a schema"""
        if schema_type and schema_type in DatasetSchemaValidator.MINIMUM_SCHEMAS:
            schema = DatasetSchemaValidator.MINIMUM_SCHEMAS[schema_type]
            return {
                'required': schema['required_columns'],
                'aliases': schema['column_aliases']
            }
        
        # Return all possible columns across all schemas
        all_cols = {}
        for schema_data in DatasetSchemaValidator.MINIMUM_SCHEMAS.values():
            for col, aliases in schema_data['column_aliases'].items():
                if col not in all_cols:
                    all_cols[col] = aliases
        
        return all_cols
    
    @staticmethod
    def generate_validation_report(df: pd.DataFrame) -> str:
        """Generate a detailed validation report"""
        valid, result = DatasetSchemaValidator.validate_dataset(df)
        
        report = []
        report.append("=" * 60)
        report.append("DATASET VALIDATION REPORT")
        report.append("=" * 60)
        report.append(f"Detected Schema: {result['schema_description']}")
        report.append(f"Total Rows: {result['rows_count']:,}")
        report.append(f"Total Columns: {result['total_columns']}")
        report.append("")
        
        report.append("REQUIRED COLUMNS:")
        report.append("-" * 60)
        for col in result['required_columns']:
            if col in result['found_columns']:
                report.append(f"  ✓ {col}: {result['found_columns'][col]}")
            else:
                report.append(f"  ✗ {col}: MISSING")
        
        if result['extra_columns_count'] > 0:
            report.append("")
            report.append(f"ADDITIONAL COLUMNS ({result['extra_columns_count']}):")
            report.append("-" * 60)
            report.append("These extra columns will help generate more detailed insights:")
            for col in df.columns:
                if col.lower() not in [c.lower() for c in result['required_columns']]:
                    report.append(f"  • {col}")
        
        if not valid:
            report.append("")
            report.append("VALIDATION FAILED")
            report.append("-" * 60)
            report.append(result['message'])
            report.append("")
            report.append("SUGGESTIONS:")
            report.append("-" * 60)
            for i, suggestion in enumerate(result['suggestions'], 1):
                report.append(f"  {i}. {suggestion}")
        else:
            report.append("")
            report.append("VALIDATION PASSED ✓")
            report.append("-" * 60)
            report.append(result['success_message'])
            if 'bonus_message' in result:
                report.append(result['bonus_message'])
        
        report.append("=" * 60)
        
        return "\n".join(report)
