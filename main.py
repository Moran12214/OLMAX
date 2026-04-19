from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2
import os
import time

app = FastAPI()

# 1. CORS налаштування
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    """Спроби підключення до БД з невеликою затримкою"""
    for i in range(5):
        try:
            return psycopg2.connect(DATABASE_URL)
        except Exception as e:
            print(f"Спроба {i+1}: База ще не готова... {e}")
            time.sleep(2)
    return psycopg2.connect(DATABASE_URL)

def init_db():
    """Створення таблиць при старті"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS cars (
            id SERIAL PRIMARY KEY,
            title TEXT,
            price TEXT,
            image TEXT,
            description TEXT,
            year INTEGER,
            mileage TEXT
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

@app.on_event("startup")
def startup():
    init_db()

# 2. ПІДКЛЮЧЕННЯ СТАТИКИ (CSS, JS)
# Важливо: ці папки повинні бути в репозиторії поруч із main.py
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# 3. МАРШРУТИ ДЛЯ СТОРІНОК (HTML)
@app.get("/")
async def read_index():
    # Тепер при переході на головну відкриється файл, а не текст
    return FileResponse('index.html')

@app.get("/katalog")
async def read_katalog():
    return FileResponse('katalog.html')

# 4. API МАРШРУТИ (ДАНІ)
@app.get("/status") # Перейменували, щоб не заважало головній сторінці
def health_check():
    return {"status": "online", "message": "OLMAX API is running"}

@app.get("/cars")
def get_cars():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, title, price, image, description, year, mileage FROM cars")
        rows = cur.fetchall()
        
        cars = []
        for row in rows:
            cars.append({
                "id": row[0], "title": row[1], "price": row[2], 
                "image": row[3], "description": row[4], 
                "year": row[5], "mileage": row[6]
            })
        
        cur.close()
        conn.close()
        return cars
    except Exception as e:
        return {"error": str(e)}