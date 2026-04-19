from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
import time

app = FastAPI()

# CORS - дозволяємо запити з будь-яких доменів
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    # Додаємо невелику затримку та спроби підключення, щоб база встигла прокинутись
    count = 0
    while count < 5:
        try:
            return psycopg2.connect(DATABASE_URL)
        except Exception as e:
            print(f"Помилка підключення до БД: {e}. Пробую ще раз...")
            time.sleep(2)
            count += 1
    raise Exception("Не вдалося підключитися до бази даних")

def init_db():
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

@app.get("/")
def root():
    return {"status": "Server is running"}

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
                "id": row[0],
                "title": row[1],
                "price": row[2],
                "image": row[3],
                "description": row[4],
                "year": row[5],
                "mileage": row[6]
            })
        
        cur.close()
        conn.close()
        return cars
    except Exception as e:
        return {"error": str(e)}