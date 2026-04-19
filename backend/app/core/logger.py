import os
from datetime import datetime
import logging

DIR_LOG = "runtime_logs"
os.makedirs(DIR_LOG, exist_ok=True)

today_date = datetime.utcnow().strftime("%Y-%M-%d")
log_file_path = os.path.join(DIR_LOG, today_date)

# Create logger
logger = logging.getLogger("msgclickon")
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
    
