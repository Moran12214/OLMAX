from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 ПІДКЛЮЧЕННЯ ДО POSTGRES
DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL)

# 🔧 Створення таблиці
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

init_db()

# 📦 API
@app.get("/cars")
def get_cars():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT * FROM cars")
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