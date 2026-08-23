"""Constrained Rising Stones API and SDO login client.

All HTTP traffic goes through :class:`ApiClient`, which owns the Chrome TLS fingerprint,
headers, cookies, response limits, and safe error translation. Rust controls encrypted
cookie persistence and never returns credentials to the webview.
"""

import base64
import json
import sys
import time
import uuid
from typing import Any, Collection

try:
    from curl_cffi import requests
except ModuleNotFoundError:
    requests = None


def configure_standard_streams() -> None:
    """Force UTF-8 for Rust pipes instead of inheriting the Windows console code page."""
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8")


configure_standard_streams()


SITE_INDEX_URL = "https://ff14risingstones.web.sdo.com/pc/index.html"
SITE_REFERER = "https://ff14risingstones.web.sdo.com/"
LOGIN_REFERER = "https://login.u.sdo.com/"
LOGIN_STATUS_URL = "https://apiff14risingstones.web.sdo.com/api/home/GHome/isLogin"
GLAMOUR_LIST_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/glamour/glamoursList"
)
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
MAX_RESPONSE_BYTES = 5 * 1024 * 1024

BASE_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cache-Control": "no-cache",
    "Origin": "https://ff14risingstones.web.sdo.com",
    "Pragma": "no-cache",
    "Referer": SITE_REFERER,
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
    ),
}


class ApiClientError(RuntimeError):
    """A safe error that may be returned to Rust without leaking request details."""


class ApiClient:
    """Own the fingerprinted session and enforce one network/error policy."""

    def __init__(self, snapshot: dict[str, Any] | None = None) -> None:
        if requests is None:
            raise ApiClientError("curl_cffi is missing. Install python/requirements.txt.")
        self.session = requests.Session(impersonate="chrome", default_headers=False)
        self.session.headers.update(BASE_HEADERS)
        self._restore_cookies(snapshot)

    def _restore_cookies(self, snapshot: dict[str, Any] | None) -> None:
        if not snapshot:
            return
        # Redirects can persist both `host` and `.host` forms. Keep the newest value for
        # each effective scope so libcurl never sends duplicate cookie names.
        cookies_by_scope: dict[tuple[str, str, str], dict[str, Any]] = {}
        for cookie in snapshot.get("cookies", []):
            scope = (
                cookie["name"],
                cookie.get("domain", "").lstrip(".").lower(),
                cookie.get("path", "/"),
            )
            cookies_by_scope[scope] = cookie
        for cookie in cookies_by_scope.values():
            self.session.cookies.set(
                cookie["name"],
                cookie["value"],
                domain=cookie.get("domain", ""),
                path=cookie.get("path", "/"),
                secure=bool(cookie.get("secure", False)),
            )

    def snapshot(self) -> dict[str, Any]:
        cookies = []
        for cookie in self.session.cookies.jar:
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

    def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        accepted_statuses: Collection[int] = range(200, 300),
        max_bytes: int = MAX_RESPONSE_BYTES,
        error_message: str = "The remote service request failed.",
        **kwargs: Any,
    ) -> Any:
        merged_headers = {**BASE_HEADERS, **(headers or {})}
        try:
            response = self.session.request(
                method,
                url,
                headers=merged_headers,
                timeout=20,
                **kwargs,
            )
        except Exception as error:
            raise ApiClientError(error_message) from error
        if response.status_code not in accepted_statuses:
            raise ApiClientError(f"{error_message} (HTTP {response.status_code})")
        if len(response.content) > max_bytes:
            raise ApiClientError("The remote service response exceeded the size limit.")
        return response

    @staticmethod
    def parse_json(response: Any, error_message: str) -> dict[str, Any]:
        try:
            payload = response.json()
        except Exception as error:
            raise ApiClientError(error_message) from error
        if not isinstance(payload, dict):
            raise ApiClientError(error_message)
        return payload


def strip_jsonp(payload: str) -> dict[str, Any]:
    try:
        payload = payload.strip()
        left, right = payload.find("("), payload.rfind(")")
        value = json.loads(payload if left == -1 else payload[left + 1 : right])
    except (TypeError, ValueError) as error:
        raise ApiClientError("The SDO login endpoint returned invalid data.") from error
    if not isinstance(value, dict):
        raise ApiClientError("The SDO login endpoint returned invalid data.")
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
    client: ApiClient,
    url: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    response = client.request(
        "GET",
        url,
        params=params,
        headers={"Referer": LOGIN_REFERER},
        error_message="The SDO login request failed.",
    )
    return strip_jsonp(response.text)


def extend_info(biz_context: str) -> str:
    return json.dumps({"bizContext": biz_context}, separators=(",", ":"))


def bootstrap(client: ApiClient) -> str:
    """Create a CAS session and return the bizContext required by later requests."""
    client.session.cookies.set("IS_ONELOGIN", "1", domain="login.u.sdo.com", path="/")
    client.session.cookies.set(
        "web_guidid",
        str(int(time.time() * 1000))[-11:],
        domain="login.u.sdo.com",
        path="/",
    )
    client.request(
        "GET", SITE_INDEX_URL, error_message="Unable to initialize the Rising Stones login."
    )
    client.request(
        "GET",
        SERVICE_URL,
        allow_redirects=False,
        accepted_statuses=(200, 302),
        error_message="Unable to initialize the Rising Stones login.",
    )
    client.request(
        "GET",
        IFRAME_URL,
        headers={"Referer": SITE_REFERER},
        error_message="Unable to initialize the Rising Stones login.",
    )

    params = common_params()
    params.update(
        {"callback": "ssoLogin_JSONPMethod", "extendInfo": "{}", "_": now_ms()}
    )
    get_jsonp(client, "https://w.cas.sdo.com/authen/ssoLogin.jsonp", params)

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
        client, "https://n2.cas.sdo.com/authen/v2/getSystemConfig.jsonp", params
    )
    biz_context = payload.get("data", {}).get("bizContext")
    if payload.get("return_code") != 0 or not biz_context:
        raise ApiClientError("Unable to initialize the SDO login session.")
    return str(biz_context)


def start_push(client: ApiClient, account: str) -> dict[str, Any]:
    biz_context = bootstrap(client)

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
        client, "https://w.cas.sdo.com/authen/checkAccountType.jsonp", params
    )
    require_success(checked, "Unable to verify the SDO account.")

    params["callback"] = "sendPushMessage_JSONPMethod"
    params["_"] = now_ms()
    pushed = get_jsonp(
        client, "https://w.cas.sdo.com/authen/sendPushMessage.jsonp", params
    )
    require_success(pushed, "Unable to send the one-tap login request.")
    return pending_result(client, biz_context, "awaiting_confirmation")


def poll_push(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
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
        client, "https://w.cas.sdo.com/authen/pushMessageLogin.jsonp", params
    )
    if payload.get("return_code") == PENDING_PUSH_CODE:
        return pending_result(client, biz_context, "awaiting_confirmation")
    require_success(payload, "The one-tap login confirmation failed.")
    return finish_ticket_login(client, biz_context, payload)


def start_qr(client: ApiClient) -> dict[str, Any]:
    biz_context = bootstrap(client)
    response = client.request(
        "GET",
        "https://w.cas.sdo.com/authen/getcodekey.jsonp",
        params={
            "maxsize": 145,
            "appId": APP_ID,
            "areaId": AREA_ID,
            "authenSource": 2,
            "source": "pc",
            "r": str(time.time() % 1),
        },
        headers={"Referer": LOGIN_REFERER},
        error_message="Unable to request the SDO login QR code.",
    )
    if not response.content.startswith(b"\x89PNG"):
        raise ApiClientError("SDO did not return a valid login QR code.")
    result = pending_result(client, biz_context, "awaiting_scan")
    result["qrImageDataUrl"] = "data:image/png;base64," + base64.b64encode(
        response.content
    ).decode("ascii")
    return result


def poll_qr(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
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
        client, "https://w.cas.sdo.com/authen/codeKeyLogin.jsonp", params
    )
    if payload.get("return_code") == PENDING_QR_CODE:
        status = "scanned" if payload.get("data", {}).get("isScanned") == 1 else "awaiting_scan"
        return pending_result(client, biz_context, status)
    require_success(payload, "The QR login confirmation failed.")
    return finish_ticket_login(client, biz_context, payload)


def login_with_cookie(client: ApiClient, cookie_header: str) -> dict[str, Any]:
    if not cookie_header or len(cookie_header.encode("utf-8")) > MAX_COOKIE_BYTES:
        raise ApiClientError("The cookie is empty or exceeds 16 KB.")
    if "\r" in cookie_header or "\n" in cookie_header:
        raise ApiClientError("The cookie contains an invalid line break.")
    prime_cookie_login_session(client)
    for name, value in parse_cookie_header(cookie_header):
        # The application session is issued for the parent SDO domain. Other values can
        # remain host-only to avoid forwarding unrelated credentials to sibling services.
        domain = (
            ".sdo.com"
            if name == "ff14risingstones"
            else "apiff14risingstones.web.sdo.com"
        )
        client.session.cookies.set(
            name,
            value,
            domain=domain,
            path="/",
            secure=True,
        )
    profile = verify_login(client)
    return {"status": "success", "session": client.snapshot(), "profile": profile}


def prime_cookie_login_session(client: ApiClient) -> None:
    """Acquire host routing cookies before applying the user's authenticated cookies."""
    client.request(
        "GET",
        LOGIN_STATUS_URL,
        params={"tempsuid": str(uuid.uuid4())},
        error_message="Unable to initialize the cookie login session.",
    )


def parse_cookie_header(cookie_header: str) -> list[tuple[str, str]]:
    """Parse DevTools and Markdown-escaped Cookie headers without decoding values."""
    if cookie_header.lower().startswith("cookie:"):
        cookie_header = cookie_header[7:].strip()

    cookies = []
    for part in cookie_header.split(";"):
        if "=" not in part:
            continue
        name, value = (item.strip() for item in part.split("=", 1))
        name = name.replace("\\_", "_")
        if not name or not valid_cookie_name(name):
            raise ApiClientError("The cookie format is invalid.")
        cookies.append((name, value))
    if not cookies:
        raise ApiClientError("No usable cookie pair was found.")
    return cookies


def restore_session(client: ApiClient) -> dict[str, Any]:
    """Revalidate a decrypted local session before accepting it."""
    profile = verify_login(client)
    return {"status": "success", "session": client.snapshot(), "profile": profile}


def finish_ticket_login(
    client: ApiClient, biz_context: str, payload: dict[str, Any]
) -> dict[str, Any]:
    ticket = payload.get("data", {}).get("ticket")
    if not ticket:
        raise ApiClientError("The successful login response is missing its ticket.")

    params = common_params()
    params.update(
        {
            "callback": "getPromotionInfo_JSONPMethod",
            "extendInfo": extend_info(biz_context),
            "_": now_ms(),
        }
    )
    promotion = get_jsonp(
        client, "https://w.cas.sdo.com/authen/getPromotionInfo.jsonp", params
    )
    require_success(promotion, "Unable to complete the SDO login.")

    client.request(
        "GET",
        f"{SERVICE_URL}&ticket={ticket}",
        allow_redirects=False,
        accepted_statuses=(200, 302),
        error_message="The Rising Stones login ticket could not be redeemed.",
    )
    profile = verify_login(client)
    return {"status": "success", "session": client.snapshot(), "profile": profile}


def verify_login(client: ApiClient) -> dict[str, str]:
    """Accept a login only when isLogin returns a valid account profile."""
    response = client.request(
        "GET",
        LOGIN_STATUS_URL,
        params={"tempsuid": str(uuid.uuid4())},
        error_message="Unable to verify the Rising Stones login.",
    )
    payload = client.parse_json(
        response, "The Rising Stones login endpoint returned invalid data."
    )
    data = payload.get("data")
    if payload.get("code") != 10000 or not isinstance(data, dict) or not data.get("displayAccount"):
        raise ApiClientError("The cookie is invalid or expired.")
    return {
        "displayAccount": str(data.get("displayAccount", "")),
        "characterName": str(data.get("character_name", "")),
        "areaName": str(data.get("area_name", "")),
        "groupName": str(data.get("group_name", "")),
    }


def pending_result(
    client: ApiClient, biz_context: str, status: str
) -> dict[str, Any]:
    return {
        "status": status,
        "session": client.snapshot(),
        "bizContext": biz_context,
    }


def require_success(payload: dict[str, Any], fallback: str) -> None:
    if payload.get("return_code") == 0:
        return
    message = str(payload.get("return_message") or "").strip()
    raise ApiClientError(message[:160] if message else fallback)


def valid_cookie_name(name: str) -> bool:
    allowed = set("!#$%&'*+-.^_`|~")
    return name.isascii() and all(
        character.isalnum() or character in allowed for character in name
    )


def now_ms() -> int:
    return int(time.time() * 1000)


def fetch_glamour_page(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Fetch one constrained glamour page with the authenticated API session."""
    params = {
        "page": request["page"],
        "limit": request["limit"],
        "order": request["order"],
    }
    if request.get("raceId") is not None:
        params["race_id"] = request["raceId"]
    if request.get("genderId") is not None:
        params["gender_id"] = request["genderId"]
    response = client.request(
        "GET",
        GLAMOUR_LIST_URL,
        params=params,
        headers={
            "Referer": "https://ff14risingstones.web.sdo.com/pc/index.html#/glamour"
        },
        discard_cookies=True,
        allow_redirects=False,
        error_message="The Rising Stones glamour request failed.",
    )
    try:
        body = response.content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ApiClientError(
            "The Rising Stones glamour endpoint returned invalid text."
        ) from error
    return {"status": response.status_code, "body": body}


def main() -> None:
    request = json.load(sys.stdin)
    operation = request.get("operation")
    client = ApiClient(request.get("session"))
    if operation == "startPush":
        result = start_push(client, request["account"])
    elif operation == "pollPush":
        result = poll_push(client, request)
    elif operation == "startQr":
        result = start_qr(client)
    elif operation == "pollQr":
        result = poll_qr(client, request)
    elif operation == "cookieLogin":
        result = login_with_cookie(client, request["cookie"])
    elif operation == "restoreSession":
        result = restore_session(client)
    elif operation == "fetchGlamourPage":
        result = fetch_glamour_page(client, request)
    else:
        raise ApiClientError("Unsupported API operation.")
    # ASCII escaping keeps the pipe valid JSON regardless of the Windows console code page.
    json.dump(result, sys.stdout, ensure_ascii=True)


if __name__ == "__main__":
    try:
        main()
    except ApiClientError as error:
        print(str(error)[:240] or "The Rising Stones request failed.", file=sys.stderr)
        raise SystemExit(1)
    except Exception:
        # Unexpected errors may include URLs or local paths, so emit fixed safe copy.
        print("The Rising Stones request failed. Check the network and retry.", file=sys.stderr)
        raise SystemExit(1)
