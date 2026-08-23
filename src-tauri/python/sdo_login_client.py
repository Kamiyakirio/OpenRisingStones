"""Constrained SDO login protocol client.

The script accepts only fixed operations and required fields. Cookies are exchanged with
Rust through stdin and stdout, never persisted, logged, or returned to the webview.
"""

import base64
import json
import sys
import time
from typing import Any

from curl_cffi import requests


SITE_INDEX_URL = "https://ff14risingstones.web.sdo.com/pc/index.html"
SITE_REFERER = "https://ff14risingstones.web.sdo.com/"
LOGIN_REFERER = "https://login.u.sdo.com/"
SERVICE_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/GHome/login"
    "?redirectUrl=https://ff14risingstones.web.sdo.com/pc/index.html"
)
IFRAME_URL = (
    "https://login.u.sdo.com/sdo/iframe/"
    "?appId=6788&areaId=1&thirdParty=wegame%7C310"
    "&returnURL=https%3A%2F%2Fapiff14risingstones.web.sdo.com%2Fapi%2Fhome%2F"
    "GHome%2Flogin%3FredirectUrl%3Dhttps%3A%2F%2Fff14risingstones.web.sdo.com%2Fpc%2Findex.html"
)

APP_ID = 6788
AREA_ID = 1
PENDING_PUSH_CODE = -10516808
PENDING_QR_CODE = -10515805
MAX_COOKIE_BYTES = 16 * 1024

BASE_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cache-Control": "no-cache",
    "Origin": "https://ff14risingstones.web.sdo.com",
    "Pragma": "no-cache",
    "Referer": SITE_REFERER,
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    ),
}


def build_session(snapshot: dict[str, Any] | None = None) -> requests.Session:
    session = requests.Session(impersonate="chrome", default_headers=False)
    session.headers.update(BASE_HEADERS)
    if snapshot:
        for cookie in snapshot.get("cookies", []):
            session.cookies.set(
                cookie["name"],
                cookie["value"],
                domain=cookie.get("domain", ""),
                path=cookie.get("path", "/"),
                secure=bool(cookie.get("secure", False)),
            )
    return session


def snapshot_session(session: requests.Session) -> dict[str, Any]:
    cookies = []
    for cookie in session.cookies.jar:
        if cookie.is_expired():
            continue
        cookies.append(
            {
                "name": cookie.name,
                "value": cookie.value,
                "domain": cookie.domain,
                "path": cookie.path,
                "secure": cookie.secure,
            }
        )
    return {"cookies": cookies}


def strip_jsonp(payload: str) -> dict[str, Any]:
    payload = payload.strip()
    left, right = payload.find("("), payload.rfind(")")
    value = json.loads(payload if left == -1 else payload[left + 1 : right])
    if not isinstance(value, dict):
        raise RuntimeError("The SDO login endpoint returned invalid data.")
    return value


def common_params(product_version: str = "v5") -> dict[str, Any]:
    return {
        "appId": APP_ID,
        "areaId": AREA_ID,
        "serviceUrl": SERVICE_URL,
        "productVersion": product_version,
        "frameType": 3,
        "locale": "zh_CN",
        "version": 21,
        "tag": 20,
        "authenSource": 2,
        "productId": 2,
        "scene": "login",
        "usage": "aliCode",
        "bizType": "",
        "source": "pc",
    }


def get_jsonp(
    session: requests.Session,
    url: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    response = session.get(
        url,
        params=params,
        headers={**BASE_HEADERS, "Referer": LOGIN_REFERER},
        timeout=20,
    )
    response.raise_for_status()
    return strip_jsonp(response.text)


def extend_info(biz_context: str) -> str:
    return json.dumps({"bizContext": biz_context}, separators=(",", ":"))


def bootstrap(session: requests.Session) -> str:
    """Create a CAS session and return the bizContext required by later requests."""
    session.cookies.set("IS_ONELOGIN", "1", domain="login.u.sdo.com", path="/")
    session.cookies.set(
        "web_guidid",
        str(int(time.time() * 1000))[-11:],
        domain="login.u.sdo.com",
        path="/",
    )
    session.get(SITE_INDEX_URL, headers=BASE_HEADERS, timeout=20).raise_for_status()
    response = session.get(
        SERVICE_URL,
        allow_redirects=False,
        headers=BASE_HEADERS,
        timeout=20,
    )
    if response.status_code not in (200, 302):
        raise RuntimeError("Unable to initialize the Rising Stones login.")
    session.get(
        IFRAME_URL,
        headers={**BASE_HEADERS, "Referer": SITE_REFERER},
        timeout=20,
    ).raise_for_status()

    params = common_params()
    params.update(
        {"callback": "ssoLogin_JSONPMethod", "extendInfo": "{}", "_": now_ms()}
    )
    get_jsonp(session, "https://w.cas.sdo.com/authen/ssoLogin.jsonp", params)

    params = common_params()
    params.update(
        {
            "callback": "getSystemConfig_JSONPMethod",
            "scene": "sendSms",
            "extendInfo": "{}",
            "_": now_ms(),
        }
    )
    payload = get_jsonp(
        session, "https://n2.cas.sdo.com/authen/v2/getSystemConfig.jsonp", params
    )
    biz_context = payload.get("data", {}).get("bizContext")
    if payload.get("return_code") != 0 or not biz_context:
        raise RuntimeError("Unable to initialize the SDO login session.")
    return str(biz_context)


def start_push(account: str) -> dict[str, Any]:
    session = build_session()
    biz_context = bootstrap(session)

    params = common_params()
    params.update(
        {
            "callback": "checkAccountType_JSONPMethod",
            "inputUserId": account,
            "extendInfo": extend_info(biz_context),
            "_": now_ms(),
        }
    )
    checked = get_jsonp(
        session, "https://w.cas.sdo.com/authen/checkAccountType.jsonp", params
    )
    require_success(checked, "Unable to verify the SDO account.")

    params["callback"] = "sendPushMessage_JSONPMethod"
    params["_"] = now_ms()
    pushed = get_jsonp(
        session, "https://w.cas.sdo.com/authen/sendPushMessage.jsonp", params
    )
    require_success(pushed, "Unable to send the one-tap login request.")
    return pending_result(session, biz_context, "awaiting_confirmation")


def poll_push(request: dict[str, Any]) -> dict[str, Any]:
    session = build_session(request["session"])
    biz_context = request["bizContext"]
    params = common_params()
    params.update(
        {
            "callback": "pushMessageLogin_JSONPMethod",
            "extendInfo": extend_info(biz_context),
            "_": now_ms(),
        }
    )
    payload = get_jsonp(
        session, "https://w.cas.sdo.com/authen/pushMessageLogin.jsonp", params
    )
    if payload.get("return_code") == PENDING_PUSH_CODE:
        return pending_result(session, biz_context, "awaiting_confirmation")
    require_success(payload, "The one-tap login confirmation failed.")
    return finish_ticket_login(session, biz_context, payload)


def start_qr() -> dict[str, Any]:
    session = build_session()
    biz_context = bootstrap(session)
    response = session.get(
        "https://w.cas.sdo.com/authen/getcodekey.jsonp",
        params={
            "maxsize": 145,
            "appId": APP_ID,
            "areaId": AREA_ID,
            "authenSource": 2,
            "source": "pc",
            "r": str(time.time() % 1),
        },
        headers={**BASE_HEADERS, "Referer": LOGIN_REFERER},
        timeout=20,
    )
    response.raise_for_status()
    if not response.content.startswith(b"\x89PNG"):
        raise RuntimeError("SDO did not return a valid login QR code.")
    result = pending_result(session, biz_context, "awaiting_scan")
    result["qrImageDataUrl"] = "data:image/png;base64," + base64.b64encode(
        response.content
    ).decode("ascii")
    return result


def poll_qr(request: dict[str, Any]) -> dict[str, Any]:
    session = build_session(request["session"])
    biz_context = request["bizContext"]
    params = common_params("3.1.0")
    params.update(
        {
            "callback": "codeKeyLogin_JSONPMethod",
            "codeKey": "",
            "code": "300",
            "extendInfo": extend_info(biz_context),
            "_": now_ms(),
        }
    )
    payload = get_jsonp(
        session, "https://w.cas.sdo.com/authen/codeKeyLogin.jsonp", params
    )
    if payload.get("return_code") == PENDING_QR_CODE:
        status = "scanned" if payload.get("data", {}).get("isScanned") == 1 else "awaiting_scan"
        return pending_result(session, biz_context, status)
    require_success(payload, "The QR login confirmation failed.")
    return finish_ticket_login(session, biz_context, payload)


def login_with_cookie(cookie_header: str) -> dict[str, Any]:
    if not cookie_header or len(cookie_header.encode("utf-8")) > MAX_COOKIE_BYTES:
        raise RuntimeError("The cookie is empty or exceeds 16 KB.")
    if "\r" in cookie_header or "\n" in cookie_header:
        raise RuntimeError("The cookie contains an invalid line break.")
    if cookie_header.lower().startswith("cookie:"):
        cookie_header = cookie_header[7:].strip()

    session = build_session()
    count = 0
    for part in cookie_header.split(";"):
        if "=" not in part:
            continue
        name, value = (item.strip() for item in part.split("=", 1))
        if not name or not valid_cookie_name(name):
            raise RuntimeError("The cookie format is invalid.")
        session.cookies.set(
            name,
            value,
            domain="apiff14risingstones.web.sdo.com",
            path="/",
            secure=True,
        )
        count += 1
    if count == 0:
        raise RuntimeError("No usable cookie pair was found.")
    profile = verify_login(session)
    return {"status": "success", "session": snapshot_session(session), "profile": profile}


def finish_ticket_login(
    session: requests.Session, biz_context: str, payload: dict[str, Any]
) -> dict[str, Any]:
    ticket = payload.get("data", {}).get("ticket")
    if not ticket:
        raise RuntimeError("The successful login response is missing its ticket.")

    params = common_params()
    params.update(
        {
            "callback": "getPromotionInfo_JSONPMethod",
            "extendInfo": extend_info(biz_context),
            "_": now_ms(),
        }
    )
    promotion = get_jsonp(
        session, "https://w.cas.sdo.com/authen/getPromotionInfo.jsonp", params
    )
    require_success(promotion, "Unable to complete the SDO login.")

    response = session.get(
        f"{SERVICE_URL}&ticket={ticket}",
        allow_redirects=False,
        headers=BASE_HEADERS,
        timeout=20,
    )
    if response.status_code not in (200, 302):
        raise RuntimeError("The Rising Stones login ticket could not be redeemed.")
    profile = verify_login(session)
    return {"status": "success", "session": snapshot_session(session), "profile": profile}


def verify_login(session: requests.Session) -> dict[str, str]:
    """Accept a login only when isLogin returns a valid account profile."""
    response = session.get(
        "https://apiff14risingstones.web.sdo.com/api/home/GHome/isLogin",
        params={"tempsuid": str(now_ms())},
        headers=BASE_HEADERS,
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data")
    if payload.get("code") != 10000 or not isinstance(data, dict) or not data.get("displayAccount"):
        raise RuntimeError("The cookie is invalid or expired.")
    return {
        "displayAccount": str(data.get("displayAccount", "")),
        "characterName": str(data.get("character_name", "")),
        "areaName": str(data.get("area_name", "")),
        "groupName": str(data.get("group_name", "")),
    }


def pending_result(
    session: requests.Session, biz_context: str, status: str
) -> dict[str, Any]:
    return {
        "status": status,
        "session": snapshot_session(session),
        "bizContext": biz_context,
    }


def require_success(payload: dict[str, Any], fallback: str) -> None:
    if payload.get("return_code") == 0:
        return
    message = str(payload.get("return_message") or "").strip()
    raise RuntimeError(message[:160] if message else fallback)


def valid_cookie_name(name: str) -> bool:
    allowed = set("!#$%&'*+-.^_`|~")
    return name.isascii() and all(
        character.isalnum() or character in allowed for character in name
    )


def now_ms() -> int:
    return int(time.time() * 1000)


def main() -> None:
    request = json.load(sys.stdin)
    operation = request.get("operation")
    if operation == "startPush":
        result = start_push(request["account"])
    elif operation == "pollPush":
        result = poll_push(request)
    elif operation == "startQr":
        result = start_qr()
    elif operation == "pollQr":
        result = poll_qr(request)
    elif operation == "cookieLogin":
        result = login_with_cookie(request["cookie"])
    else:
        raise RuntimeError("Unsupported login operation.")
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except ModuleNotFoundError:
        print("curl_cffi is missing. Install python/requirements.txt.", file=sys.stderr)
        raise SystemExit(1)
    except RuntimeError as error:
        # Business errors use fixed copy or a length-limited service message.
        print(str(error)[:240] or "The SDO login request failed.", file=sys.stderr)
        raise SystemExit(1)
    except Exception:
        # Network exceptions may include URLs, so collapse them to prevent credential leaks.
        print("The SDO login request failed. Check the network and retry.", file=sys.stderr)
        raise SystemExit(1)
