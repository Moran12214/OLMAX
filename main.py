from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import time

app = FastAPI()

# 1. Налаштування CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Пріоритет: змінна від Railway, якщо немає — пряме посилання
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:xQVNCoxtAWcPIhFgdoNWDlGiNOXwoToE@postgres.railway.internal:5432/railway")

def get_conn():
    """Функція для безпечного підключення до бази з повторними спробами"""
    for i in range(5):
        try:
            conn = psycopg2.connect(DATABASE_URL)
            return conn
        except Exception as e:
            print(f"Спроба підключення {i+1} не вдалася: {e}")
            time.sleep(2)
    raise Exception("Не вдалося підключитися до PostgreSQL")

@app.on_event("startup")
def startup():
    """Створення таблиць при запуску сервера"""
    conn = get_conn()
    cur = conn.cursor()
    # Створюємо таблицю авто
    cur.execute("""
        CREATE TABLE IF NOT EXISTS cars (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            price TEXT,
            image TEXT,
            description TEXT,
            year INTEGER DEFAULT 0,
            mileage TEXT,
            transmission TEXT,
            engine_volume TEXT
        );
    """)
    # Створюємо таблицю заявок
    cur.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            name TEXT,
            phone TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    # Перевірка наявності стовпців для старих баз
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission TEXT")
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS engine_volume TEXT")
    
    conn.commit()
    cur.close()
    conn.close()
    print("--- БАЗА ДАНИХ ГОТОВА ---")

# 2. Підключення статики (перевірка наявності папок)
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# 3. Маршрути для HTML сторінок
@app.get("/")
@app.get("/admin")
@app.get("/admin.html")
async def read_admin():
    return FileResponse('admin.html')

@app.get("/stats.html")
async def read_stats_page():
    return FileResponse('stats.html')

@app.get("/katalog.html")
async def read_katalog():
    return FileResponse('katalog.html')

# 4. API МАРШРУТИ

@app.get("/stats")
def get_stats():
    """Повертає кількість авто та заявок для дашборду"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM cars")
        c_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM applications")
        a_count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {"cars_count": c_count, "apps_count": a_count}
    except Exception as e:
        return {"cars_count": 0, "apps_count": 0, "error": str(e)}

@app.get("/cars")
def get_cars():
    """Отримує список всіх авто"""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM cars ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.post("/cars")
async def add_car(car: dict):
    """Зберігає нове авто з адмінки"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO cars (title, price, image, description, year, mileage, transmission, engine_volume)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
    """, (
        car.get('title'), car.get('price'), car.get('image'),
        car.get('description'), car.get('year', 0), car.get('mileage'),
        car.get('transmission'), car.get('engine_volume')
    ))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "id": new_id}

@app.delete("/cars/{car_id}")
def delete_car(car_id: int):
    """Видаляє авто за його ID"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM cars WHERE id = %s", (car_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "deleted"}

@app.get("/applications")
def get_apps():
    """Отримує список всіх заявок клієнтів"""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM applications ORDER BY id DESC")
    apps = cur.fetchall()
    cur.close()
    conn.close()
    return apps