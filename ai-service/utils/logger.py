"""
Simple logging utility for consistent log formatting.
"""

import logging
import sys

def get_logger(name: str) -> logging.Logger:
    """
    Creates and returns a configured logger.
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        console_handler.stream.reconfigure(encoding='utf-8')
        logger.addHandler(console_handler)
        
    return logger
