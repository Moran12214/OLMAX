from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2
import os
import time

app = FastAPI()

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    for i in range(5):
        try:
            return psycopg2.connect(DATABASE_URL)
        except Exception:
            time.sleep(2)
    return psycopg2.connect(DATABASE_URL)

@app.on_event("startup")
def startup():
    # Створення таблиці, якщо її немає
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

# 2. ПІДКЛЮЧЕННЯ СТАТИКИ
# Якщо style.css лежить у папці css, цей рядок зробить його доступним
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")

if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# 3. МАРШРУТИ
@app.get("/")
async def read_index():
    return FileResponse('index.html')

# Сторінка каталогу (додаємо .html в маршрут для сумісності з кнопками)
@app.get("/katalog.html")
@app.get("/katalog")
async def read_katalog():
    return FileResponse('katalog.html')

# Якщо є сторінка контактів
@app.get("/kontakt.html")
@app.get("/kontakt")
async def read_kontakt():
    return FileResponse('kontakt.html')

@app.get("/cars")
def get_cars():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, title, price, image, description, year, mileage FROM cars")
        rows = cur.fetchall()
        cars = [{"id": r[0], "title": r[1], "price": r[2], "image": r[3], "description": r[4], "year": r[5], "mileage": r[6]} for r in rows]
        cur.close()
        conn.close()
        return cars
    except Exception as e:
        return {"error": str(e)}