FROM python:3.11-slim

WORKDIR /app

COPY services/scrapers/instamart-worker/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    playwright install --with-deps chromium

COPY packages/ /app/packages/
COPY services/scrapers/instamart-worker/src/ /app/src/

ENV PYTHONPATH=/app

CMD ["python", "src/worker.py"]
