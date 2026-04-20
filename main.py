from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:xQVNCoxtAWcPIhFgdoNWDlGiNOXwoToE@postgres.railway.internal:5432/railway")

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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            name TEXT,
            phone TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission TEXT")
    cur.execute("ALTER TABLE cars ADD COLUMN IF NOT EXISTS engine_volume TEXT")
    conn.commit()
    cur.close()
    conn.close()

if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")
if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

# СТОРІНКИ
@app.get("/")
@app.get("/index.html")
async def read_index(): return FileResponse('index.html')

@app.get("/katalog.html")
async def read_katalog(): return FileResponse('katalog.html')

@app.get("/product.html")
async def read_product(): return FileResponse('product.html')

@app.get("/admin.html")
@app.get("/admin")
async def read_admin(): return FileResponse('admin.html')

@app.get("/stats.html")
async def read_stats_page(): return FileResponse('stats.html')

@app.get("/kontakt.html")
@app.get("/kontakt")
async def read_kontakt(): return FileResponse('kontakt.html')

# API
@app.get("/cars")
def get_cars():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM cars ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.get("/stats")
def get_stats():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT COUNT(*) as cars_count FROM cars")
    c = cur.fetchone()
    cur.execute("SELECT COUNT(*) as apps_count FROM applications")
    a = cur.fetchone()
    cur.close()
    conn.close()
    return {"cars_count": c['cars_count'], "apps_count": a['apps_count']}

@app.post("/cars")
async def add_car(car: dict):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO cars (title, price, image, description, year, mileage, transmission, engine_volume)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
    """, (car.get('title'), car.get('price'), car.get('image'), car.get('description'), 
          car.get('year', 0), car.get('mileage'), car.get('transmission'), car.get('engine_volume')))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id}

@app.post("/applications")
async def post_app(data: dict):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO applications (name, phone, message) VALUES (%s, %s, %s)", 
                (data.get('name'), data.get('phone'), data.get('message')))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success"}

@app.delete("/cars/{car_id}")
def delete_car(car_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM cars WHERE id = %s", (car_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "deleted"}

@app.get("/applications")
def get_apps():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM applications ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows