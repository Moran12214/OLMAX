FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home olmax
COPY main.py *.html ./
COPY css ./css
COPY js ./js
COPY assets ./assets
COPY tools ./tools
RUN mkdir -p /data && chown olmax:olmax /data
USER olmax
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT', '8000')+'/healthz', timeout=3)"
CMD ["python", "tools/serve.py"]
