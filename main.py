from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2
from psycopg2.extras import RealDictCursor # Додано для зручної роботи з об'єктами
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
            mileage TEXT,
            transmission TEXT,
            engine_volume TEXT
        )
    """)
    # Примусово додаємо стовпці, якщо таблиця вже була створена раніше
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission TEXT")
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS engine_volume TEXT")
    
    # Створюємо таблицю для заявок, щоб статистика не видавала помилку
    cur.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            name TEXT,
            phone TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    cur.close()
    conn.close()

# 2. ПІДКЛЮЧЕННЯ СТАТИКИ
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# 3. МАРШРУТИ ДЛЯ СТОРІНОК
@app.get("/")
@app.get("/index.html")
async def read_index():
    return FileResponse('index.html')

@app.get("/katalog.html")
@app.get("/katalog")
async def read_katalog():
    return FileResponse('katalog.html')

@app.get("/product.html")
@app.get("/product")
async def read_product():
    return FileResponse('product.html')

@app.get("/admin.html")
@app.get("/admin")
async def read_admin():
    return FileResponse('admin.html')

# 4. API МАРШРУТИ (БЕКЕНД)

# Отримання всіх авто (виправлено undefined)
@app.get("/cars")
def get_cars():
    try:
        conn = get_conn()
        # Використовуємо RealDictCursor, щоб JS розумів назви полів (title, price...)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM cars")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        return {"error": str(e)}

# Новий маршрут для статистики (щоб прибрати undefined в адмінці)
@app.get("/stats")
def get_stats():
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM cars")
        cars_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM applications")
        apps_count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        return {
            "cars_count": cars_count,
            "apps_count": apps_count
        }
    except Exception as e:
        return {"cars_count": 0, "apps_count": 0, "error": str(e)}

# Маршрут для отримання конкретного авто по ID
@app.get("/cars/{car_id}")
def get_car(car_id: int):
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM cars WHERE id = %s", (car_id,))
        car = cur.fetchone()
        cur.close()
        conn.close()
        return car
    except Exception as e:
        return {"error": str(e)}