"""Fetch the Rising Stones glamour list with a Chrome-compatible TLS fingerprint.

The endpoint and headers are fixed. An encrypted-at-rest login snapshot arrives through stdin,
is restored into an in-memory session, and is discarded when this process exits.
"""

import json
import sys

from curl_cffi import requests


ENDPOINT = "https://apiff14risingstones.web.sdo.com/api/home/glamour/glamoursList"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def main() -> None:
    request = json.load(sys.stdin)
    session = requests.Session(impersonate="chrome", default_headers=False)
    for cookie in request["session"].get("cookies", []):
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
            "Origin": "https://ff14risingstones.web.sdo.com",
            "Referer": "https://ff14risingstones.web.sdo.com/pc/index.html#/glamour",
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
