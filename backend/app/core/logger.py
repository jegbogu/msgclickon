import logging
import os
from datetime import datetime

# Ensure runtime_log folder exists
LOG_DIR = "runtime_log"
os.makedirs(LOG_DIR, exist_ok=True)

# Log filename with date
today_str = datetime.utcnow().strftime("%Y-%m-%d")
log_file_path = os.path.join(LOG_DIR, f"{today_str}.log")

# Create logger
logger = logging.getLogger("altitude_trust_bank")
logger.setLevel(logging.INFO)

# Prevent duplicate handlers on reload
if not logger.handlers:
    file_handler = logging.FileHandler(log_file_path, mode="a")
    
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def log_info(module_path: str, message: str):
    logger.info(f"{module_path} | {message}")


def log_error(module_path: str, message: str):
    logger.error(f"{module_path} | {message}")
