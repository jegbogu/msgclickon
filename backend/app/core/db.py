from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core import dbconfig
from app.core import logger



DB_URL = dbconfig.DATABASE_URL
engine = create_engine(DB_URL)
module_path = "Database Connection"

sessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = sessionLocal()
    try:
        yield db
    finally:
        db.close()
        
def test_db_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        info_message = "Database connection successful."
        
        logger.log_info(module_path | info_message )
        print("f✅ {info_message}")
        return True
    except Exception as e:
        error_message = f"Database Connection failed :{str(e)}"
        logger.log_info(module_path | error_message)
        print(error_message)
        return False
