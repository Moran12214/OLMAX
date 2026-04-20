
from fastapi import FastAPI, UploadFile, File, Form
from typing import List
import json, os

app = FastAPI()

cars = []

@app.post("/cars")
async def create_car(
    title: str = Form(...),
    price: str = Form(...),
    year: str = Form(...),
    mileage: str = Form(...),
    description: str = Form(...),
    transmission: str = Form(...),
    engine_volume: str = Form(...),
    images: List[UploadFile] = File(...)
):
    image_urls = []

    os.makedirs("uploads", exist_ok=True)

    for img in images[:15]:
        file_path = f"uploads/{img.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await img.read())
        image_urls.append(file_path)

    new_car = {
        "id": len(cars) + 1,
        "title": title,
        "price": price,
        "year": year,
        "mileage": mileage,
        "description": description,
        "transmission": transmission,
        "engine_volume": engine_volume,
        "image": json.dumps(image_urls)
    }

    cars.append(new_car)

    os.makedirs("data", exist_ok=True)
    with open("data/cars.json", "w") as f:
        json.dump(cars, f, indent=4)

    return {"status": "ok"}
