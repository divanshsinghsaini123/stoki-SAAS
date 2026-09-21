from fastapi import FastAPI

app = FastAPI(title="Stoki Inventory Service")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "inventory-service"}
