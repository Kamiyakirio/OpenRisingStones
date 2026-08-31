"""Constrained Rising Stones API and SDO login client.

All HTTP traffic goes through :class:`ApiClient`, which owns the Chrome TLS fingerprint,
headers, cookies, response limits, and safe error translation. Rust controls encrypted
cookie persistence and never returns credentials to the webview.
"""

import base64
import json
import os
import re
import sys
import time
import uuid
from typing import Any, Collection
from urllib.parse import quote, urlencode, urlparse

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
GLAMOUR_DETAIL_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/glamour/glamourDetail"
)
GLAMOUR_SEARCH_URL = (
    "https://apiff14risingstones.web.sdo.com/api/common/search"
)
RECRUIT_JOB_CONFIG_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/recruit/getJobConfigList"
)
RECRUIT_DUTY_CONFIG_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/recruit/getFbConfigList"
)
RECRUIT_LABEL_CONFIG_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/recruit/fbLabelList"
)
RECRUIT_LIST_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/recruit/recruitFbList"
)
RECRUIT_DETAIL_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/recruit/getRecruitFbDetail"
)
RECRUIT_AREA_CONFIG_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/"
    "groupAndRole/getAreaAndGroupList"
)
TELEPORT_ORIGIN = "https://ff14bjz.sdo.com"
TELEPORT_PAGE_URL = f"{TELEPORT_ORIGIN}/RegionKanTelepo"
TELEPORT_REFERER = f"{TELEPORT_PAGE_URL}"
TELEPORT_LOGIN_FRAME_URL = (
    "https://login.u.sdo.com/sdo/Login/LoginFrameFC.php"
    "?pm=2&appId=100001900&areaId=1001&customSecurityLevel=2"
    "&target=top&thirdParty=wegame"
    "&returnURL=https%3A%2F%2Fff14bjz.sdo.com%2FRegionKanTelepo"
    "&backUrl=https%3A%2F%2Fff14bjz.sdo.com%2FRegionKanTelepo"
)
TELEPORT_ENDPOINTS = {
    "pageInit": "/api/orderserivce/pageInit",
    "sources": "/api/orderserivce/queryGroupListTravelSource",
    "targets": "/api/orderserivce/queryGroupListTravelTarget",
    "roles": "/api/gmallgateway/queryRoleList4Migration",
    "queueTime": "/api/orderserivce/travelQueueTime",
    "createOrder": "/api/orderserivce/travelOrder",
    "orderStatus": "/api/gmallgateway/queryOrderStatus",
    "confirmOrder": "/api/gmallgateway/migrationConfirmOrder",
    "orders": "/api/orderserivce/queryMigrationOrders",
    "returnGroups": "/api/gmallgateway/queryGroupListCrossSource",
    "travelBack": "/api/orderserivce/travelBack",
    "validateTicket": "/api/gmallinter/validateTicket",
}
WIKI_ORIGIN = "https://ff14.huijiwiki.com"
WIKI_IMPERSONATE = "safari2601"
WIKI_ITEM_NAMESPACE = "\u7269\u54c1:"
CHARACTER_BINDING_URL = (
    "https://apiff14risingstones.web.sdo.com/api/home/"
    "groupAndRole/getCharacterBindInfo"
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
TELEPORT_APP_ID = 100001900
TELEPORT_AREA_ID = 1001
PENDING_PUSH_CODE = -10516808
PENDING_QR_CODE = -10515805
UNBOUND_CHARACTER_CODES = {10103, 10104}
MAX_COOKIE_BYTES = 16 * 1024
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
MAX_USER_AGENT_BYTES = 512
MAX_AVATAR_BYTES = 2 * 1024 * 1024
AVATAR_PATH_PREFIXES = ("/avatar/", "/default/")
NETWORK_CONSOLE_ENV = "OPEN_RISING_STONES_NETWORK_CONSOLE"
NETWORK_CONSOLE_PREFIX = "ORS_NETWORK_CONSOLE "

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


def emit_network_console(phase: str, **fields: Any) -> None:
    """Emit one machine-readable line for the debug-only WebView console bridge."""
    if os.environ.get(NETWORK_CONSOLE_ENV) != "1":
        return
    try:
        payload = json.dumps(
            {"phase": phase, **fields},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        print(f"{NETWORK_CONSOLE_PREFIX}{payload}", file=sys.stderr, flush=True)
    except Exception:
        # Logging must never change request behavior, even for unusual body objects.
        return


def request_console_url(url: str, kwargs: dict[str, Any]) -> str:
    """Build the complete request URL, including params, for preflight logging."""
    params = kwargs.get("params")
    if not params:
        return url
    try:
        query = urlencode(params, doseq=True)
    except Exception:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{query}"


def request_console_body(kwargs: dict[str, Any]) -> Any:
    """Return the complete configured request body without including headers."""
    if "json" in kwargs:
        return kwargs["json"]
    if "data" in kwargs:
        return console_body(kwargs["data"])
    if "content" in kwargs:
        return console_body(kwargs["content"])
    return None


def console_body(value: Any) -> Any:
    """Preserve text bodies and encode binary bodies without truncation."""
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return {
                "encoding": "base64",
                "value": base64.b64encode(value).decode("ascii"),
            }
    return value


class ApiClientError(RuntimeError):
    """A safe error that may be returned to Rust without leaking request details."""


def normalize_user_agent(user_agent: str | None) -> str:
    """Validate an imported browser identity before using it in request headers."""
    if user_agent is None:
        return BASE_HEADERS["User-Agent"]
    if not isinstance(user_agent, str):
        raise ApiClientError("The browser User-Agent is invalid.")
    value = user_agent.strip()
    if (
        len(value) < 20
        or len(value.encode("utf-8")) > MAX_USER_AGENT_BYTES
        or not value.isascii()
        or any(ord(character) < 32 or ord(character) == 127 for character in value)
    ):
        raise ApiClientError("The browser User-Agent is invalid.")
    return value


class ApiClient:
    """Own the fingerprinted session and enforce one network/error policy."""

    def __init__(
        self,
        snapshot: dict[str, Any] | None = None,
        user_agent: str | None = None,
    ) -> None:
        if requests is None:
            raise ApiClientError("curl_cffi is missing. Install python/requirements.txt.")
        snapshot_user_agent = snapshot.get("userAgent") if snapshot else None
        requested_user_agent = (
            user_agent if user_agent is not None else snapshot_user_agent
        )
        self.user_agent = normalize_user_agent(requested_user_agent)
        self.base_headers = {**BASE_HEADERS, "User-Agent": self.user_agent}
        self.session = requests.Session(impersonate="chrome", default_headers=False)
        self.session.headers.update(self.base_headers)
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
        return {"cookies": cookies, "userAgent": self.user_agent}

    def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        accepted_statuses: Collection[int] = range(200, 300),
        max_bytes: int = MAX_RESPONSE_BYTES,
        error_message: str = "The remote service request failed.",
        log_response_body: bool = True,
        **kwargs: Any,
    ) -> Any:
        merged_headers = {**self.base_headers, **(headers or {})}
        request_url = request_console_url(url, kwargs)
        method_name = method.upper()
        emit_network_console(
            "request",
            method=method_name,
            url=request_url,
            body=request_console_body(kwargs),
        )
        started_at = time.perf_counter()
        try:
            response = self.session.request(
                method,
                url,
                headers=merged_headers,
                timeout=20,
                **kwargs,
            )
        except Exception as error:
            emit_network_console(
                "error",
                method=method_name,
                url=request_url,
                durationMs=round((time.perf_counter() - started_at) * 1000, 1),
                errorType=type(error).__name__,
                message=str(error),
            )
            raise ApiClientError(error_message) from error
        emit_network_console(
            "response",
            method=method_name,
            url=str(getattr(response, "url", request_url)),
            status=response.status_code,
            durationMs=round((time.perf_counter() - started_at) * 1000, 1),
            body=(
                console_body(response.content)
                if log_response_body
                else {"binaryBytes": len(response.content)}
            ),
        )
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


def teleport_login_params(product_version: str = "v5") -> dict[str, Any]:
    """Return the CAS contract used by the official Regional Teleport page."""
    return {
        "appId": TELEPORT_APP_ID,
        "areaId": TELEPORT_AREA_ID,
        "serviceUrl": TELEPORT_PAGE_URL,
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
    return finalize_authenticated_login(client)


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
    return finalize_authenticated_login(client)


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
    return finalize_authenticated_login(client)


def verify_login(client: ApiClient) -> tuple[dict[str, str], bool]:
    """Return the account summary and whether isLogin itself requires binding."""
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
    if payload.get("code") in UNBOUND_CHARACTER_CODES:
        return (
            {
                "displayAccount": str(
                    data.get("displayAccount", "") if isinstance(data, dict) else ""
                ),
                "characterName": "",
                "areaName": "",
                "groupName": "",
            },
            True,
        )
    if (
        payload.get("code") not in (10000, 10002)
        or not isinstance(data, dict)
        or not data.get("displayAccount")
    ):
        raise ApiClientError("The cookie is invalid or expired.")
    return (
        {
            "displayAccount": str(data.get("displayAccount", "")),
            "characterName": str(data.get("character_name", "")),
            "areaName": str(data.get("area_name", "")),
            "groupName": str(data.get("group_name", "")),
        },
        False,
    )


def finalize_authenticated_login(client: ApiClient) -> dict[str, Any]:
    """Require both account authentication and the official character context."""
    account_profile, binding_required = verify_login(client)
    if binding_required:
        return {
            "status": "binding_required",
            "session": client.snapshot(),
            "profile": account_profile,
        }
    character = get_character_binding(client)
    if character is None:
        return {
            "status": "binding_required",
            "session": client.snapshot(),
            "profile": account_profile,
        }
    return {
        "status": "success",
        "session": client.snapshot(),
        "profile": {
            "displayAccount": account_profile["displayAccount"],
            "characterName": str(character.get("character_name", "")),
            "areaName": str(character.get("area_name", "")),
            "groupName": str(character.get("group_name", "")),
        },
    }


def get_character_binding(client: ApiClient) -> dict[str, Any] | None:
    """Return the current platform binding, or None when the account must choose one."""
    response = client.request(
        "GET",
        CHARACTER_BINDING_URL,
        params={"platform": 2},
        error_message="Unable to read the bound Rising Stones character.",
    )
    payload = client.parse_json(
        response, "The character binding endpoint returned invalid data."
    )
    data = payload.get("data")
    if payload.get("code") in UNBOUND_CHARACTER_CODES:
        return None
    if payload.get("code") not in (10000, 10002):
        raise ApiClientError("Unable to read the bound Rising Stones character.")
    if not isinstance(data, dict) or not data.get("character_name"):
        return None
    return data


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


def bootstrap_teleport(client: ApiClient) -> str:
    """Create the app-specific CAS session used by Regional Teleport."""
    client.request(
        "GET",
        TELEPORT_LOGIN_FRAME_URL,
        headers={"Referer": TELEPORT_PAGE_URL},
        error_message="Unable to initialize the Regional Teleport login.",
    )
    params = teleport_login_params()
    params.update(
        {"callback": "ssoLogin_JSONPMethod", "extendInfo": "{}", "_": now_ms()}
    )
    get_jsonp(client, "https://w.cas.sdo.com/authen/ssoLogin.jsonp", params)

    params = teleport_login_params()
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
        raise ApiClientError("Unable to initialize the Regional Teleport login.")
    return str(biz_context)


def start_teleport_push(
    client: ApiClient, request: dict[str, Any]
) -> dict[str, Any]:
    """Send a one-tap confirmation for the Regional Teleport application."""
    account = bounded_account(request.get("account"))
    biz_context = bootstrap_teleport(client)

    params = teleport_login_params()
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
    require_success(checked, "Unable to verify the Regional Teleport account.")

    params["callback"] = "sendPushMessage_JSONPMethod"
    params["_"] = now_ms()
    pushed = get_jsonp(
        client, "https://w.cas.sdo.com/authen/sendPushMessage.jsonp", params
    )
    require_success(pushed, "Unable to send the Regional Teleport confirmation.")
    return {
        "status": "awaiting_confirmation",
        "session": client.snapshot(),
        "bizContext": biz_context,
    }


def poll_teleport_push(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Poll a Regional Teleport one-tap confirmation and redeem its ticket."""
    biz_context = bounded_biz_context(request.get("bizContext"))
    params = teleport_login_params()
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
        return {
            "status": "awaiting_confirmation",
            "session": client.snapshot(),
            "bizContext": biz_context,
        }
    require_success(payload, "The Regional Teleport confirmation failed.")
    return finish_teleport_ticket_login(client, biz_context, payload)


def start_teleport_qr(client: ApiClient) -> dict[str, Any]:
    """Create an app-specific CAS QR session for Regional Teleport."""
    biz_context = bootstrap_teleport(client)

    response = client.request(
        "GET",
        "https://w.cas.sdo.com/authen/getcodekey.jsonp",
        params={
            "maxsize": 145,
            "appId": TELEPORT_APP_ID,
            "areaId": TELEPORT_AREA_ID,
            "authenSource": 2,
            "source": "pc",
            "r": str(time.time() % 1),
        },
        headers={"Referer": LOGIN_REFERER},
        error_message="Unable to request the Regional Teleport QR code.",
    )
    if not response.content.startswith(b"\x89PNG"):
        raise ApiClientError("SDO did not return a valid Regional Teleport QR code.")
    return {
        "status": "awaiting_scan",
        "session": client.snapshot(),
        "bizContext": biz_context,
        "qrImageDataUrl": "data:image/png;base64,"
        + base64.b64encode(response.content).decode("ascii"),
    }


def poll_teleport_qr(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Poll the Regional Teleport QR code and redeem its service ticket."""
    biz_context = bounded_biz_context(request.get("bizContext"))
    params = teleport_login_params("3.1.0")
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
        status = (
            "scanned"
            if payload.get("data", {}).get("isScanned") == 1
            else "awaiting_scan"
        )
        return {
            "status": status,
            "session": client.snapshot(),
            "bizContext": biz_context,
        }
    require_success(payload, "The Regional Teleport QR confirmation failed.")
    return finish_teleport_ticket_login(client, biz_context, payload)


def finish_teleport_ticket_login(
    client: ApiClient, biz_context: str, payload: dict[str, Any]
) -> dict[str, Any]:
    """Redeem and validate a successful Regional Teleport CAS ticket."""
    ticket = str(payload.get("data", {}).get("ticket") or "")
    if not ticket:
        raise ApiClientError("The Regional Teleport login response has no ticket.")

    promotion_params = teleport_login_params()
    promotion_params.update(
        {
            "callback": "getPromotionInfo_JSONPMethod",
            "extendInfo": extend_info(biz_context),
            "_": now_ms(),
        }
    )
    promotion = get_jsonp(
        client,
        "https://w.cas.sdo.com/authen/getPromotionInfo.jsonp",
        promotion_params,
    )
    require_success(promotion, "Unable to complete the Regional Teleport login.")

    client.request(
        "GET",
        TELEPORT_PAGE_URL,
        params={"ticket": ticket},
        allow_redirects=False,
        accepted_statuses=(200, 302),
        error_message="The Regional Teleport ticket could not be redeemed.",
    )
    validation = teleport_request(
        client,
        TELEPORT_ENDPOINTS["validateTicket"],
        {"ticket": ticket},
    )
    require_success(validation, "The Regional Teleport ticket was rejected.")
    return {"status": "success", "session": client.snapshot()}


def fetch_teleport(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Execute one allowlisted Regional Teleport operation."""
    action = str(request.get("action") or "")
    if action == "overview":
        page = bounded_int(request.get("page", 1), 1, 10_000, "page")
        page_size = bounded_int(request.get("pageSize", 10), 1, 50, "page size")
        payload = {
            "pageInit": teleport_request(
                client, TELEPORT_ENDPOINTS["pageInit"], {"migrationType": 4}
            ),
            "sources": teleport_request(
                client,
                TELEPORT_ENDPOINTS["sources"],
                {"appId": TELEPORT_APP_ID},
            ),
            "orders": teleport_request(
                client,
                TELEPORT_ENDPOINTS["orders"],
                {"appId": TELEPORT_APP_ID, "pageIndex": page, "pageNum": page_size},
            ),
        }
    elif action in {"targets", "roles"}:
        area_id = bounded_int(request.get("areaId"), 1, 1000, "area identifier")
        group_id = bounded_int(request.get("groupId"), 1, 1000, "group identifier")
        payload = teleport_request(
            client,
            TELEPORT_ENDPOINTS[action],
            {"appId": TELEPORT_APP_ID, "areaId": area_id, "groupId": group_id},
        )
    elif action == "queueTime":
        payload = teleport_request(
            client,
            TELEPORT_ENDPOINTS[action],
            {
                "appId": TELEPORT_APP_ID,
                "migrationType": 4,
                "targetArea": bounded_int(
                    request.get("targetAreaId"), 1, 1000, "target area identifier"
                ),
                "targetGroupId": bounded_int(
                    request.get("targetGroupId"),
                    1,
                    1000,
                    "target group identifier",
                ),
            },
        )
    elif action == "createOrder":
        role = request.get("role")
        if not isinstance(role, dict):
            raise ApiClientError("The Regional Teleport role is invalid.")
        params = {
            "appId": TELEPORT_APP_ID,
            "areaId": bounded_int(request.get("areaId"), 1, 1000, "area identifier"),
            "areaName": bounded_text(request.get("areaName"), 32, "area name"),
            "groupId": bounded_int(request.get("groupId"), 1, 1000, "group identifier"),
            "groupCode": bounded_code(request.get("groupCode"), "group code"),
            "groupName": bounded_text(request.get("groupName"), 32, "group name"),
            "productId": 1,
            "productNum": 1,
            "migrationType": 4,
            "targetArea": bounded_int(
                request.get("targetAreaId"), 1, 1000, "target area identifier"
            ),
            "targetAreaName": bounded_text(
                request.get("targetAreaName"), 32, "target area name"
            ),
            "targetGroupId": bounded_int(
                request.get("targetGroupId"), 1, 1000, "target group identifier"
            ),
            "targetGroupCode": bounded_code(
                request.get("targetGroupCode"), "target group code"
            ),
            "targetGroupName": bounded_text(
                request.get("targetGroupName"), 32, "target group name"
            ),
            "roleList": json.dumps(
                [
                    {
                        "roleId": bounded_identifier(role.get("roleId"), "role identifier"),
                        "roleName": bounded_text(role.get("roleName"), 64, "role name"),
                        "key": bounded_int(role.get("key", 0), 0, 100, "role key"),
                    }
                ],
                ensure_ascii=False,
                separators=(",", ":"),
            ),
            "isMigrationTimes": 0,
        }
        payload = teleport_request(client, TELEPORT_ENDPOINTS[action], params)
    elif action in {"orderStatus", "confirmOrder"}:
        params = {
            "orderId": bounded_order_id(request.get("orderId")),
        }
        if action == "confirmOrder":
            params["confirmType"] = bounded_int(
                request.get("confirmType"), 0, 1, "confirmation type"
            )
        payload = teleport_request(client, TELEPORT_ENDPOINTS[action], params)
    elif action == "orders":
        payload = teleport_request(
            client,
            TELEPORT_ENDPOINTS[action],
            {
                "appId": TELEPORT_APP_ID,
                "pageIndex": bounded_int(request.get("page"), 1, 10_000, "page"),
                "pageNum": bounded_int(
                    request.get("pageSize"), 1, 50, "page size"
                ),
            },
        )
    elif action == "returnGroups":
        payload = teleport_request(
            client,
            TELEPORT_ENDPOINTS[action],
            {"appId": TELEPORT_APP_ID},
        )
    elif action == "travelBack":
        payload = teleport_request(
            client,
            TELEPORT_ENDPOINTS[action],
            {
                "travelOrderId": bounded_order_id(request.get("orderId")),
                "groupId": bounded_int(
                    request.get("groupId"), 1, 1000, "group identifier"
                ),
                "groupCode": bounded_code(request.get("groupCode"), "group code"),
                "groupName": bounded_text(request.get("groupName"), 32, "group name"),
            },
        )
    else:
        raise ApiClientError("The Regional Teleport operation is not supported.")
    return {"payload": payload, "session": client.snapshot()}


def teleport_request(
    client: ApiClient, path: str, params: dict[str, Any]
) -> dict[str, Any]:
    response = client.request(
        "GET",
        f"{TELEPORT_ORIGIN}{path}",
        params=params,
        headers={"Referer": TELEPORT_REFERER},
        allow_redirects=False,
        error_message="The Regional Teleport request failed.",
    )
    return client.parse_json(
        response, "The Regional Teleport endpoint returned invalid data."
    )


def bounded_int(value: Any, minimum: int, maximum: int, label: str) -> int:
    if isinstance(value, bool):
        raise ApiClientError(f"The Regional Teleport {label} is invalid.")
    try:
        parsed = int(value)
    except (TypeError, ValueError) as error:
        raise ApiClientError(f"The Regional Teleport {label} is invalid.") from error
    if parsed < minimum or parsed > maximum:
        raise ApiClientError(f"The Regional Teleport {label} is invalid.")
    return parsed


def bounded_account(value: Any) -> str:
    text = str(value or "").strip()
    if len(text) < 5 or len(text) > 64 or any(
        ord(character) < 32 or ord(character) == 127 for character in text
    ):
        raise ApiClientError("The Regional Teleport account is invalid.")
    return text


def bounded_biz_context(value: Any) -> str:
    text = str(value or "")
    if not text or len(text) > 512:
        raise ApiClientError("The Regional Teleport login session is invalid.")
    return text


def bounded_text(value: Any, maximum: int, label: str) -> str:
    text = str(value or "").strip()
    if not text or len(text) > maximum or any(
        ord(character) < 32 or ord(character) == 127 for character in text
    ):
        raise ApiClientError(f"The Regional Teleport {label} is invalid.")
    return text


def bounded_code(value: Any, label: str) -> str:
    text = bounded_text(value, 64, label)
    if not re.fullmatch(r"[A-Za-z0-9_]+", text):
        raise ApiClientError(f"The Regional Teleport {label} is invalid.")
    return text


def bounded_identifier(value: Any, label: str) -> str:
    text = str(value or "").strip()
    if not re.fullmatch(r"\d{1,32}", text):
        raise ApiClientError(f"The Regional Teleport {label} is invalid.")
    return text


def bounded_order_id(value: Any) -> str:
    text = str(value or "").strip()
    if not re.fullmatch(r"GM\d{8,40}", text):
        raise ApiClientError("The Regional Teleport order identifier is invalid.")
    return text


def fetch_glamour_page(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Fetch one constrained glamour page with the authenticated API session."""
    keywords = str(request.get("keywords") or "").strip()
    params = {
        "page": request["page"],
        "limit": request["limit"],
    }
    if request.get("order") is not None:
        params["order"] = request["order"]
    if keywords:
        url = GLAMOUR_SEARCH_URL
        params.update(
            {
                "type": 7,
                "keywords": keywords,
                "tempsuid": str(uuid.uuid4()),
            }
        )
        if request.get("searchByEquipment") is True:
            params["searchByEquipment"] = 1
    else:
        url = GLAMOUR_LIST_URL
        if request.get("raceId") is not None:
            params["race_id"] = request["raceId"]
        if request.get("genderId") is not None:
            params["gender_id"] = request["genderId"]
    response = client.request(
        "GET",
        url,
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
    return {
        "status": response.status_code,
        "body": body,
        "url": str(getattr(response, "url", url) or url),
    }


def fetch_glamour_detail(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Fetch one glamour detail record without exposing the authenticated session."""
    response = client.request(
        "GET",
        GLAMOUR_DETAIL_URL,
        params={"id": request["id"], "tempsuid": str(uuid.uuid4())},
        headers={
            "Referer": "https://ff14risingstones.web.sdo.com/pc/index.html#/glamour"
        },
        discard_cookies=True,
        allow_redirects=False,
        error_message="The Rising Stones glamour detail request failed.",
    )
    try:
        body = response.content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ApiClientError(
            "The Rising Stones glamour detail endpoint returned invalid text."
        ) from error
    return {
        "status": response.status_code,
        "body": body,
        "url": str(
            getattr(response, "url", GLAMOUR_DETAIL_URL) or GLAMOUR_DETAIL_URL
        ),
    }


def fetch_recruit_endpoint(
    client: ApiClient,
    url: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Fetch one allowlisted public recruitment endpoint anonymously."""
    response = client.request(
        "GET",
        url,
        params={**(params or {}), "tempsuid": str(uuid.uuid4())},
        headers={
            "Referer": "https://ff14risingstones.web.sdo.com/pc/index.html#/recruit"
        },
        discard_cookies=True,
        allow_redirects=False,
        error_message="The Rising Stones recruitment request failed.",
    )
    try:
        body = response.content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ApiClientError(
            "The Rising Stones recruitment endpoint returned invalid text."
        ) from error
    return {
        "status": response.status_code,
        "body": body,
        "url": str(getattr(response, "url", url) or url),
    }


def fetch_recruit_config(client: ApiClient) -> dict[str, Any]:
    """Fetch the three public datasets used by the recruitment filters."""
    return {
        "jobs": fetch_recruit_endpoint(client, RECRUIT_JOB_CONFIG_URL),
        "duties": fetch_recruit_endpoint(client, RECRUIT_DUTY_CONFIG_URL),
        "labels": fetch_recruit_endpoint(client, RECRUIT_LABEL_CONFIG_URL),
        "areas": fetch_recruit_endpoint(client, RECRUIT_AREA_CONFIG_URL),
    }


def fetch_recruit_page(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Fetch one public recruitment page with the supported filters only."""
    params = {
        "page": request["page"],
        "limit": request["limit"],
        "fb_name": request.get("dutyName", ""),
        "fb_type": request.get("dutyType", ""),
        "position": "",
        "team_composition": "",
    }
    if request.get("targetAreaId") is not None:
        params["target_area_id"] = request["targetAreaId"]
    return fetch_recruit_endpoint(
        client,
        RECRUIT_LIST_URL,
        params,
    )


def fetch_recruit_detail(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Fetch one complete public recruitment record."""
    return fetch_recruit_endpoint(
        client,
        RECRUIT_DETAIL_URL,
        {"id": request["id"]},
    )


def fetch_avatar(client: ApiClient, request: dict[str, Any]) -> dict[str, Any]:
    """Download one allowlisted Rising Stones avatar with official image headers."""
    url = str(request.get("url") or "").strip()
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "ff14risingstones.gcloud.com.cn"
        or parsed.port not in (None, 443)
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.path.startswith(AVATAR_PATH_PREFIXES)
        or parsed.query
        or parsed.fragment
    ):
        raise ApiClientError("The avatar URL is not supported.")
    response = client.request(
        "GET",
        url,
        headers={
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": SITE_REFERER,
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Storage-Access": "none",
        },
        discard_cookies=True,
        allow_redirects=False,
        max_bytes=MAX_AVATAR_BYTES,
        error_message="The Rising Stones avatar request failed.",
        log_response_body=False,
    )
    mime_type = str(response.headers.get("content-type") or "").split(";", 1)[0]
    if mime_type not in {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
    }:
        raise ApiClientError("The avatar response type is not supported.")
    return {
        "dataUrl": f"data:{mime_type};base64,"
        + base64.b64encode(response.content).decode("ascii")
    }


def fetch_wiki_page(
    request: dict[str, Any], session: Any | None = None
) -> dict[str, Any]:
    """Fetch one public item page with the configured Safari browser fingerprint."""
    if requests is None:
        raise ApiClientError("curl_cffi is missing. Install python/requirements.txt.")
    item_name = str(request.get("itemName") or "").strip()
    if not item_name:
        raise ApiClientError("The wiki item name is missing.")
    url = f"{WIKI_ORIGIN}/wiki/{quote(f'{WIKI_ITEM_NAMESPACE}{item_name}', safe='')}"
    referer = f"{WIKI_ORIGIN}/wiki/ItemSearch?name={quote(item_name, safe='')}"
    owns_session = session is None
    wiki_session = session or requests.Session(impersonate=WIKI_IMPERSONATE)
    try:
        response = wiki_session.request(
            "GET",
            url,
            headers={
                "Accept": (
                    "text/html,application/xhtml+xml,application/xml;q=0.9,"
                    "image/avif,image/webp,image/apng,*/*;q=0.8"
                ),
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Referer": referer,
            },
            timeout=20,
            allow_redirects=True,
        )
    except Exception as error:
        raise ApiClientError("The FFXIV wiki request failed.") from error
    finally:
        if owns_session:
            wiki_session.close()

    if len(response.content) > MAX_RESPONSE_BYTES:
        raise ApiClientError("The wiki response exceeded the size limit.")
    try:
        body = response.content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ApiClientError("The wiki returned invalid text.") from error
    response_headers = getattr(response, "headers", {})
    mitigated = str(response_headers.get("cf-mitigated") or "").lower()
    lowered = body.lower()
    challenged = (
        mitigated == "challenge"
        or response.status_code == 403
        or "just a moment" in lowered
        or "cdn-cgi/challenge-platform" in lowered
    )
    return {
        "status": response.status_code,
        "body": body,
        "url": str(getattr(response, "url", url) or url),
        "challenged": challenged,
    }


def main() -> None:
    request = json.load(sys.stdin)
    operation = request.get("operation")
    if operation == "fetchWikiPage":
        result = fetch_wiki_page(request)
        json.dump(result, sys.stdout, ensure_ascii=True)
        return
    client = ApiClient(request.get("session"), request.get("userAgent"))
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
    elif operation == "fetchGlamourDetail":
        result = fetch_glamour_detail(client, request)
    elif operation == "fetchRecruitConfig":
        result = fetch_recruit_config(client)
    elif operation == "fetchRecruitPage":
        result = fetch_recruit_page(client, request)
    elif operation == "fetchRecruitDetail":
        result = fetch_recruit_detail(client, request)
    elif operation == "fetchAvatar":
        result = fetch_avatar(client, request)
    elif operation == "startTeleportQr":
        result = start_teleport_qr(client)
    elif operation == "pollTeleportQr":
        result = poll_teleport_qr(client, request)
    elif operation == "startTeleportPush":
        result = start_teleport_push(client, request)
    elif operation == "pollTeleportPush":
        result = poll_teleport_push(client, request)
    elif operation == "fetchTeleport":
        result = fetch_teleport(client, request)
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
