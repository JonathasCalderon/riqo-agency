#!/usr/bin/env python3
"""
CSV Data Processing Script for Riqo Agency
Normalizes CSV data, particularly handling date formatting issues
"""

import pandas as pd
import numpy as np
import json
import sys
import os
from datetime import datetime
import argparse
import logging
from typing import Dict, List, Any, Optional
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CSVProcessor:
    """Main CSV processing class"""
    
    def __init__(self, input_file: str, output_file: str, config: Optional[Dict] = None):
        self.input_file = input_file
        self.output_file = output_file
        self.config = config or {}
        self.df = None
        self.processing_log = []
        
    def load_csv(self) -> bool:
        """Load CSV file with various encoding attempts"""
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        
        for encoding in encodings:
            try:
                self.df = pd.read_csv(self.input_file, encoding=encoding)
                logger.info(f"Successfully loaded CSV with {encoding} encoding")
                logger.info(f"Shape: {self.df.shape}")
                self.processing_log.append(f"Loaded CSV with {encoding} encoding - {self.df.shape[0]} rows, {self.df.shape[1]} columns")
                return True
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error loading CSV with {encoding}: {str(e)}")
                continue
        
        logger.error("Failed to load CSV with any encoding")
        return False
    
    def detect_date_columns(self) -> List[str]:
        """Detect potential date columns"""
        date_columns = []
        
        for col in self.df.columns:
            # Check column name patterns
            if any(keyword in col.lower() for keyword in ['date', 'fecha', 'time', 'hora', 'created', 'updated']):
                date_columns.append(col)
                continue
            
            # Check data patterns in first few non-null values
            sample_values = self.df[col].dropna().head(10).astype(str)
            date_patterns = [
                r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
                r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY or MM/DD/YYYY
                r'\d{2}-\d{2}-\d{4}',  # DD-MM-YYYY or MM-DD-YYYY
                r'\d{1,2}/\d{1,2}/\d{2,4}',  # D/M/YY or DD/MM/YYYY
            ]
            
            for value in sample_values:
                if any(re.search(pattern, value) for pattern in date_patterns):
                    date_columns.append(col)
                    break
        
        logger.info(f"Detected date columns: {date_columns}")
        return date_columns
    
    def normalize_dates(self, date_columns: List[str]) -> None:
        """Normalize date formats"""
        for col in date_columns:
            try:
                # Try to parse dates with multiple formats
                self.df[col] = pd.to_datetime(
                    self.df[col], 
                    infer_datetime_format=True,
                    errors='coerce'
                )
                
                # Convert to ISO format string
                self.df[col] = self.df[col].dt.strftime('%Y-%m-%d %H:%M:%S')
                
                # Handle NaT values
                self.df[col] = self.df[col].fillna('')
                
                logger.info(f"Normalized date column: {col}")
                self.processing_log.append(f"Normalized date column: {col}")
                
            except Exception as e:
                logger.warning(f"Could not normalize date column {col}: {str(e)}")
                self.processing_log.append(f"Warning: Could not normalize date column {col}: {str(e)}")
    
    def clean_numeric_columns(self) -> None:
        """Clean and normalize numeric columns"""
        for col in self.df.columns:
            if self.df[col].dtype in ['object']:
                # Try to convert to numeric if it looks like numbers
                sample_values = self.df[col].dropna().head(10).astype(str)
                
                # Check if values look numeric (allowing for commas, currency symbols, etc.)
                numeric_pattern = r'^[\$\€\£]?[\d,]+\.?\d*$'
                if any(re.match(numeric_pattern, str(val).strip()) for val in sample_values):
                    try:
                        # Remove currency symbols and commas
                        cleaned_values = self.df[col].astype(str).str.replace(r'[\$\€\£,]', '', regex=True)
                        self.df[col] = pd.to_numeric(cleaned_values, errors='coerce')
                        logger.info(f"Converted column {col} to numeric")
                        self.processing_log.append(f"Converted column {col} to numeric")
                    except Exception as e:
                        logger.warning(f"Could not convert {col} to numeric: {str(e)}")
    
    def handle_missing_values(self) -> None:
        """Handle missing values appropriately"""
        for col in self.df.columns:
            if self.df[col].dtype in ['float64', 'int64']:
                # Fill numeric columns with 0 or median
                fill_value = self.config.get('numeric_fill', 0)
                self.df[col] = self.df[col].fillna(fill_value)
            else:
                # Fill text columns with empty string
                fill_value = self.config.get('text_fill', '')
                self.df[col] = self.df[col].fillna(fill_value)
        
        logger.info("Handled missing values")
        self.processing_log.append("Handled missing values")
    
    def standardize_column_names(self) -> None:
        """Standardize column names"""
        # Convert to lowercase and replace spaces/special chars with underscores
        new_columns = {}
        for col in self.df.columns:
            new_col = re.sub(r'[^\w\s]', '', col.lower())  # Remove special chars
            new_col = re.sub(r'\s+', '_', new_col.strip())  # Replace spaces with underscores
            new_columns[col] = new_col
        
        self.df = self.df.rename(columns=new_columns)
        logger.info(f"Standardized column names: {list(new_columns.values())}")
        self.processing_log.append(f"Standardized column names")
    
    def remove_duplicates(self) -> None:
        """Remove duplicate rows"""
        initial_count = len(self.df)
        self.df = self.df.drop_duplicates()
        final_count = len(self.df)
        
        if initial_count != final_count:
            removed = initial_count - final_count
            logger.info(f"Removed {removed} duplicate rows")
            self.processing_log.append(f"Removed {removed} duplicate rows")
    
    def process(self) -> bool:
        """Main processing pipeline"""
        try:
            # Load the CSV
            if not self.load_csv():
                return False
            
            # Processing steps
            self.standardize_column_names()
            
            # Detect and normalize dates
            date_columns = self.detect_date_columns()
            if date_columns:
                self.normalize_dates(date_columns)
            
            # Clean numeric columns
            self.clean_numeric_columns()
            
            # Handle missing values
            self.handle_missing_values()
            
            # Remove duplicates
            self.remove_duplicates()
            
            # Save processed CSV
            self.df.to_csv(self.output_file, index=False, encoding='utf-8')
            logger.info(f"Saved processed CSV to: {self.output_file}")
            
            # Generate processing report
            self.generate_report()
            
            return True
            
        except Exception as e:
            logger.error(f"Error during processing: {str(e)}")
            return False
    
    def generate_report(self) -> None:
        """Generate processing report"""
        report = {
            'input_file': self.input_file,
            'output_file': self.output_file,
            'processing_timestamp': datetime.now().isoformat(),
            'rows_processed': len(self.df),
            'columns_processed': len(self.df.columns),
            'column_names': list(self.df.columns),
            'processing_log': self.processing_log,
            'data_types': {col: str(dtype) for col, dtype in self.df.dtypes.items()},
            'sample_data': self.df.head(3).to_dict('records') if len(self.df) > 0 else []
        }
        
        report_file = self.output_file.replace('.csv', '_report.json')
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Generated processing report: {report_file}")

def main():
    parser = argparse.ArgumentParser(description='Process CSV files for Riqo Agency')
    parser.add_argument('input_file', help='Input CSV file path')
    parser.add_argument('output_file', help='Output CSV file path')
    parser.add_argument('--config', help='JSON config file path', default=None)
    
    args = parser.parse_args()
    
    # Load config if provided
    config = {}
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config = json.load(f)
    
    # Process the CSV
    processor = CSVProcessor(args.input_file, args.output_file, config)
    success = processor.process()
    
    if success:
        print(f"SUCCESS: Processed {args.input_file} -> {args.output_file}")
        sys.exit(0)
    else:
        print(f"ERROR: Failed to process {args.input_file}")
        sys.exit(1)

if __name__ == "__main__":
    main()
