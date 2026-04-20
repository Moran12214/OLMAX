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

# Пріоритет: змінна оточення від Railway, якщо немає — твоє пряме посилання
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:xQVNCoxtAWcPIhFgdoNWDlGiNOXwoToE@postgres.railway.internal:5432/railway")

def get_conn():
    """Функція підключення до бази з повторними спробами"""
    for i in range(5):
        try:
            return psycopg2.connect(DATABASE_URL)
        except Exception:
            time.sleep(2)
    return psycopg2.connect(DATABASE_URL)

@app.on_event("startup")
def startup():
    """Створення таблиць та перевірка структури при запуску"""
    conn = get_conn()
    cur = conn.cursor()
    # Створюємо таблицю машин
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
    # Створюємо таблицю заявок
    cur.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            name TEXT,
            phone TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Додаємо стовпці, якщо таблиця вже була, а стовпців немає
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission TEXT")
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS engine_volume TEXT")
    
    conn.commit()
    cur.close()
    conn.close()

# 2. ПІДКЛЮЧЕННЯ СТАТИКИ
if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# 3. МАРШРУТИ ДЛЯ HTML СТОРІНОК
@app.get("/")
@app.get("/index.html")
async def read_index():
    return FileResponse('index.html')

@app.get("/katalog.html")
async def read_katalog():
    return FileResponse('katalog.html')

@app.get("/product.html")
async def read_product():
    return FileResponse('product.html')

@app.get("/admin.html")
@app.get("/admin")
async def read_admin():
    return FileResponse('admin.html')

@app.get("/stats.html")
async def read_stats_page():
    return FileResponse('stats.html')

# 4. API МАРШРУТИ (БЕКЕНД)

# Отримання всіх авто ( RealDictCursor прибирає undefined)
@app.get("/cars")
def get_cars():
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM cars ORDER BY id DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        return {"error": str(e)}

# Отримання одного авто за ID
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

# Додавання нового авто (POST)
@app.post("/cars")
async def add_car(car: dict):
    try:
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
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Видалення авто (DELETE)
@app.delete("/cars/{car_id}")
def delete_car(car_id: int):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM cars WHERE id = %s", (car_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "deleted"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Статистика (для дашборду адмінки)
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
        return {"cars_count": cars_count, "apps_count": apps_count}
    except Exception as e:
        return {"cars_count": 0, "apps_count": 0, "error": str(e)}

# Отримання всіх заявок
@app.get("/applications")
def get_apps():
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM applications ORDER BY id DESC")
        apps = cur.fetchall()
        cur.close()
        conn.close()
        return apps
    except Exception as e:
        return []