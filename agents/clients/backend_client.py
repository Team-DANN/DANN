import httpx
import os
from config import BACKEND_API_URL

BACKEND_API_URL = os.environ["BACKEND_API_URL"]


class BackendClient:
    """
    Thin async wrapper around the Node backend's REST API. Every method
    forwards the same bearer token the frontend sent to this service —
    we never manage auth/business-scoping ourselves, Node's requireAuth
    middleware already does that.
    """

    def __init__(self, token: str):
        self._client = httpx.AsyncClient(
            base_url=BACKEND_API_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )

    async def _get(self, path: str, params: dict | None = None) -> dict:
        response = await self._client.get(path, params=params)
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise RuntimeError(f"Backend error on {path}: {body.get('error')}")
        return body["data"]

    # Materials
    async def get_materials(self) -> list[dict]:
        return await self._get("/api/materials")

    async def get_low_stock_materials(self) -> list[dict]:
        return await self._get("/api/materials/low-stock")

    # Orders
    async def get_orders(self) -> list[dict]:
        return await self._get("/api/orders")

    async def get_unpaid_orders_summary(self) -> dict:
        return await self._get("/api/orders/unpaid-summary")

    # Products
    async def get_products(self) -> list[dict]:
        return await self._get("/api/products")

    # Batches (production)
    async def get_batches(self) -> list[dict]:
        return await self._get("/api/batches")

    # Retailers
    async def get_retailers(self) -> list[dict]:
        return await self._get("/api/retailers")

    # Business profile
    async def get_business_profile(self) -> dict:
        return await self._get("/api/business")

    # Reports (already-aggregated Node-side numbers)
    async def get_runway_report(self) -> dict:
        return await self._get("/api/reports/runway")

    async def get_receivables_report(self) -> dict:
        return await self._get("/api/reports/receivables")

    async def get_profit_summary(self) -> dict:
        return await self._get("/api/reports/profit-summary")

    async def get_weekly_margin(self) -> dict:
        return await self._get("/api/reports/weekly-margin")

    async def get_profit_by_product(self) -> list[dict]:
        return await self._get("/api/reports/profit-by-product")

    async def get_overdue_orders(self) -> list[dict]:
        return await self._get("/api/orders/overdue")

    async def close(self):
        await self._client.aclose()