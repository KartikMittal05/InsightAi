"""
Configuration module for the Customer Analytics Backend
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    
    # Flask
    DEBUG = False
    TESTING = False
    JSON_SORT_KEYS = False
    
    # Upload
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_FILE_SIZE', 50 * 1024 * 1024))  # 50MB
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'json'}
    
    # ML Models
    RFM_CLUSTERS = 4
    CHURN_THRESHOLD = 0.6
    MIN_RECOMMENDATION_CONFIDENCE = 0.5
    
    # CORS
    CORS_ORIGINS = ["*"]  # Allow all origins
    
    # Cache
    CACHE_TYPE = "simple"
    CACHE_DEFAULT_TIMEOUT = 300

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    # In production, restrict CORS origins
    CORS_ORIGINS = [
        os.environ.get('FRONTEND_URL', 'http://localhost:5173'),
    ]

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    UPLOAD_FOLDER = 'test_uploads'

def get_config(env=None):
    """Get configuration based on environment"""
    if env is None:
        env = os.environ.get('FLASK_ENV', 'development')
    
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
    }
    
    return config_map.get(env, DevelopmentConfig)
