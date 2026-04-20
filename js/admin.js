
const files = document.getElementById('carImages').files;

if (files.length > 15) {
    alert("Максимум 15 фото");
    return;
}

const formData = new FormData();

for (let i = 0; i < files.length; i++) {
    formData.append("images", files[i]);
}

formData.append("title", document.getElementById('title').value);
formData.append("price", document.getElementById('price').value);
formData.append("year", document.getElementById('year').value);
formData.append("mileage", document.getElementById('mileage').value);
formData.append("description", document.getElementById('description').value);
formData.append("transmission", document.getElementById('transmission').value);
formData.append("engine_volume", document.getElementById('engineVolume').value);

fetch(`${API_URL}/cars`, {
    method: "POST",
    body: formData
});
