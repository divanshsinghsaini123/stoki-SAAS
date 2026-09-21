from fastapi import FastAPI

app = FastAPI(title="Stoki API Gateway")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "api-gateway"}
