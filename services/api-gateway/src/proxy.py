import logging
from typing import Any
import httpx
from fastapi import Request, Response, HTTPException, status

try:
    from .config import INVENTORY_SERVICE_URL
except ImportError:
    from config import INVENTORY_SERVICE_URL

logger = logging.getLogger("gateway-proxy")

# Persistent async HTTP client for connection pooling and low latency
http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    """Returns or initializes the shared persistent AsyncClient."""
    global http_client
    if http_client is None or http_client.is_closed:
        http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=50, max_connections=200),
        )
    return http_client


async def close_http_client():
    """Closes the shared AsyncClient on gateway shutdown."""
    global http_client
    if http_client and not http_client.is_closed:
        await http_client.aclose()
        http_client = None


# Headers to strip from upstream forwarding to avoid HTTP/2 or hop-by-hop conflicts
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
}


async def forward_to_upstream(
    request: Request,
    upstream_base_url: str = INVENTORY_SERVICE_URL,
    authenticated_user: dict[str, Any] | None = None,
) -> Response:
    """
    Transparently forwards the incoming client HTTP request to the designated microservice.
    Injects tenant context headers:
      - X-Tenant-Id: Authenticated tenant UUID
      - X-User-Id: Authenticated user UUID
      - X-User-Role: User role
    """
    client = get_http_client()
    
    # Construct target URL preserving path and query string
    target_path = request.url.path
    query_string = request.url.query
    upstream_url = f"{upstream_base_url.rstrip('/')}{target_path}"
    if query_string:
        upstream_url = f"{upstream_url}?{query_string}"

    # Filter incoming headers and inject tenant identity
    forward_headers = {}
    for key, value in request.headers.items():
        if key.lower() not in HOP_BY_HOP_HEADERS:
            forward_headers[key] = value

    if authenticated_user:
        tenant_id = authenticated_user.get("tenant_id")
        user_id = authenticated_user.get("user_id")
        role = authenticated_user.get("role", "member")
        if tenant_id:
            forward_headers["X-Tenant-Id"] = str(tenant_id)
        if user_id:
            forward_headers["X-User-Id"] = str(user_id)
        if role:
            forward_headers["X-User-Role"] = str(role)

    # Read request body for POST/PUT/PATCH/DELETE
    body = await request.body()

    try:
        upstream_response = await client.request(
            method=request.method,
            url=upstream_url,
            headers=forward_headers,
            content=body,
        )

        # Prepare response headers, stripping content-encoding and hop-by-hop headers
        response_headers = {}
        for key, value in upstream_response.headers.items():
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length":
                response_headers[key] = value

        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=response_headers,
            media_type=upstream_response.headers.get("content-type"),
        )

    except httpx.ConnectError:
        logger.error(f"Cannot connect to upstream service at {upstream_base_url}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Upstream service unavailable. Please try again shortly.",
        )
    except httpx.TimeoutException:
        logger.error(f"Upstream request timed out for {upstream_url}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Upstream service request timed out.",
        )
    except Exception as e:
        logger.error(f"Unexpected proxy error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gateway encountered an error contacting upstream service.",
        )
