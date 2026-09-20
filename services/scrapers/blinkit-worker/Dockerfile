FROM python:3.11-slim

WORKDIR /app

COPY services/scrapers/blinkit-worker/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ /app/packages/
COPY services/scrapers/blinkit-worker/src/ /app/src/

ENV PYTHONPATH=/app

CMD ["python", "src/worker.py"]
