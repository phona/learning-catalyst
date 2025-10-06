"""
Utility functions for AI providers
"""

from typing import Dict, Any
import httpx


async def make_http_request(
    base_url: str, endpoint: str, headers: Dict[str, str], payload: Dict[str, Any], timeout: float = 30.0
) -> Dict[str, Any]:
    """Helper method to make HTTP requests with proper error handling"""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(f"{base_url}/{endpoint}", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as e:
        raise httpx.TimeoutException(f"Request to {endpoint} timed out") from e
    except httpx.HTTPStatusError as e:
        raise httpx.HTTPStatusError(
            f"HTTP error {e.response.status_code} when calling {endpoint}: {e.response.text}",
            request=e.request,
            response=e.response,
        ) from e
    except httpx.RequestError as e:
        raise httpx.RequestError(f"Request error when calling {endpoint}: {str(e)}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error when calling {endpoint}: {str(e)}") from e
