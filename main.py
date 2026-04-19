from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Обслуговування статичних файлів
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/data", StaticFiles(directory="data"), name="data")

def init_db():
    conn = sqlite3.connect("cars.db")
    cursor = conn.cursor()
    # Таблиця автомобілів
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT, price TEXT, image TEXT, description TEXT, year INTEGER, mileage TEXT
        )
    ''')

    # Таблиця заявок
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, phone TEXT, message TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class Car(BaseModel):
    title: str
    price: str
    image: str
    description: str
    year: int | None = None
    mileage: str | None = None

class Application(BaseModel):
    name: str
    phone: str
    message: str

@app.get("/cars")
def get_cars():
    conn = sqlite3.connect("cars.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cars")
    res = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return res

@app.post("/cars")
def add_car(car: Car):
    conn = sqlite3.connect("cars.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO cars (title, price, image, description, year, mileage) VALUES (?,?,?,?,?,?)",
                   (car.title, car.price, car.image, car.description, car.year, car.mileage))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/cars/{car_id}")
def delete_car(car_id: int):
    conn = sqlite3.connect("cars.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cars WHERE id = ?", (car_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/applications")
def save_application(app_data: Application):
    conn = sqlite3.connect("cars.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO applications (name, phone, message) VALUES (?,?,?)",
                   (app_data.name, app_data.phone, app_data.message))
    conn.commit()
    conn.close()
    return {"message": "Заявка отримана!"}

@app.get("/applications")
def get_applications():
    conn = sqlite3.connect("cars.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM applications ORDER BY date DESC")
    res = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return res

@app.delete("/applications/{app_id}")
def delete_application(app_id: int):
    conn = sqlite3.connect("cars.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Заявку видалено"}

@app.get("/stats")
def get_stats():
    conn = sqlite3.connect("cars.db")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM cars")
    total_cars = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM applications")
    total_apps = cursor.fetchone()[0]
    conn.close()
    return {"total_cars": total_cars, "total_applications": total_apps}
# Маршрути для HTML сторінок
from fastapi.responses import FileResponse, HTMLResponse

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse("index.html", media_type="text/html")

@app.get("/index.html", response_class=HTMLResponse)
async def read_index():
    return FileResponse("index.html", media_type="text/html")

@app.get("/katalog.html", response_class=HTMLResponse)
async def read_katalog():
    return FileResponse("katalog.html", media_type="text/html")

@app.get("/kontakt.html", response_class=HTMLResponse)
async def read_kontakt():
    return FileResponse("kontakt.html", media_type="text/html")

@app.get("/produkt.html", response_class=HTMLResponse)
async def read_produkt():
    return FileResponse("produkt.html", media_type="text/html")

@app.get("/admin.html", response_class=HTMLResponse)
async def read_admin():
    return FileResponse("admin.html", media_type="text/html")