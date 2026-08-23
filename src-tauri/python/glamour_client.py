"""Fetch the Rising Stones glamour list with a Chrome-compatible TLS fingerprint.

The endpoint and headers are fixed. An encrypted-at-rest login snapshot arrives through stdin,
is restored into an in-memory session, and is discarded when this process exits.
"""

import json
import sys

from curl_cffi import requests


ENDPOINT = "https://apiff14risingstones.web.sdo.com/api/home/glamour/glamoursList"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def configure_standard_streams() -> None:
    """Use UTF-8 for Rust pipes instead of inheriting the Windows console code page."""
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8")


def main() -> None:
    configure_standard_streams()
    request = json.load(sys.stdin)
    session = requests.Session(impersonate="chrome", default_headers=False)
    # Login redirects can persist both `host` and `.host` variants of the same cookie.
    # Normalize the scope before restoring them so libcurl never emits duplicate names.
    cookies_by_scope = {}
    for cookie in request["session"].get("cookies", []):
        scope = (
            cookie["name"],
            cookie.get("domain", "").lstrip(".").lower(),
            cookie.get("path", "/"),
        )
        cookies_by_scope[scope] = cookie

    for cookie in cookies_by_scope.values():
        session.cookies.set(
            cookie["name"],
            cookie["value"],
            domain=cookie.get("domain", ""),
            path=cookie.get("path", "/"),
            secure=bool(cookie.get("secure", False)),
        )

    response = session.get(
        ENDPOINT,
        params={
            "page": request["page"],
            "limit": request["limit"],
            "order": request["order"],
            "race_id": request["raceId"],
            "gender_id": request["genderId"],
        },
        headers={
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Cache-Control": "no-cache",
            "Origin": "https://ff14risingstones.web.sdo.com",
            "Pragma": "no-cache",
            "Referer": "https://ff14risingstones.web.sdo.com/pc/index.html#/glamour",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/151.0.0.0 Safari/537.36"
            ),
        },
        allow_redirects=False,
        discard_cookies=True,
        timeout=20,
    )
    body = response.content
    if len(body) > MAX_RESPONSE_BYTES:
        raise RuntimeError("The Rising Stones response exceeded the size limit.")
    result = {"status": response.status_code, "body": body.decode("utf-8")}
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except ModuleNotFoundError:
        print("curl_cffi is missing. Install python/requirements.txt.", file=sys.stderr)
        raise SystemExit(1)
    except RuntimeError as error:
        print(str(error)[:240], file=sys.stderr)
        raise SystemExit(1)
    except Exception:
        # Dependency errors may contain URLs or local paths, so return fixed safe copy.
        print("The curl_cffi request failed.", file=sys.stderr)
        raise SystemExit(1)
