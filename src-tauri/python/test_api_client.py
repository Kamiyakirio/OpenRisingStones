import json
import os
import unittest
from contextlib import redirect_stderr
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

from api_client import (
    ApiClient,
    ApiClientError,
    BASE_HEADERS,
    GLAMOUR_SEARCH_URL,
    NETWORK_CONSOLE_PREFIX,
    RECRUIT_LIST_URL,
    TELEPORT_ENDPOINTS,
    TELEPORT_ORIGIN,
    WIKI_IMPERSONATE,
    fetch_glamour_detail,
    fetch_glamour_page,
    fetch_avatar,
    fetch_recruit_page,
    fetch_teleport,
    fetch_wiki_page,
    finalize_authenticated_login,
    normalize_game_auth,
    normalize_user_agent,
    preserve_game_auth,
    start_teleport_push,
)


class FakeResponse:
    def __init__(
        self,
        status_code: int = 200,
        content: bytes = b"{}",
        url: str | None = None,
        headers: dict | None = None,
    ) -> None:
        self.status_code = status_code
        self.content = content
        self.url = url
        self.headers = headers or {}

    def json(self):
        return json.loads(self.content)

    @property
    def text(self):
        return self.content.decode("utf-8")


class FakeCookies:
    def __init__(self) -> None:
        self.jar = []

    def set(self, name, value, domain="", path="/", secure=False) -> None:
        self.jar.append(
            SimpleNamespace(
                name=name,
                value=value,
                domain=domain,
                path=path,
                secure=secure,
                is_expired=lambda: False,
            )
        )


class FakeSession:
    def __init__(self, response: FakeResponse | Exception | list) -> None:
        self.responses = response if isinstance(response, list) else [response]
        self.arguments = None
        self.cookies = FakeCookies()

    def request(self, method, url, **kwargs):
        self.arguments = (method, url, kwargs)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    def close(self):
        return None


def client_with(
    response: FakeResponse | Exception | list,
) -> tuple[ApiClient, FakeSession]:
    client = ApiClient.__new__(ApiClient)
    session = FakeSession(response)
    client.session = session
    client.user_agent = BASE_HEADERS["User-Agent"]
    client.base_headers = BASE_HEADERS
    client.game_auth = None
    return client, session


class ApiClientTests(unittest.TestCase):
    def test_network_console_logs_complete_url_and_bodies(self) -> None:
        response_url = "https://example.invalid/path?existing=1&token=request-token"
        client, _ = client_with(
            FakeResponse(content=b'{"token":"response-token"}', url=response_url)
        )
        stderr = StringIO()

        with patch.dict(os.environ, {"OPEN_RISING_STONES_NETWORK_CONSOLE": "1"}):
            with redirect_stderr(stderr):
                client.request(
                    "POST",
                    "https://example.invalid/path?existing=1",
                    params={"token": "request-token"},
                    json={"token": "request-body-token"},
                    headers={"Authorization": "not-logged"},
                )

        entries = [
            json.loads(line.removeprefix(NETWORK_CONSOLE_PREFIX))
            for line in stderr.getvalue().splitlines()
        ]
        self.assertEqual(entries[0]["url"], response_url)
        self.assertEqual(entries[0]["body"], {"token": "request-body-token"})
        self.assertNotIn("headers", entries[0])
        self.assertEqual(entries[1]["body"], '{"token":"response-token"}')

    def test_custom_user_agent_is_validated_and_persisted(self) -> None:
        user_agent = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 Chrome/151 Safari/537.36"
        )
        client = ApiClient(user_agent=user_agent)
        restored = ApiClient(snapshot=client.snapshot())

        self.assertEqual(client.base_headers["User-Agent"], user_agent)
        self.assertEqual(client.snapshot()["userAgent"], user_agent)
        self.assertEqual(restored.base_headers["User-Agent"], user_agent)
        with self.assertRaisesRegex(ApiClientError, "User-Agent is invalid"):
            normalize_user_agent("Mozilla/5.0\r\nCookie: secret")

    def test_game_auth_context_is_validated_and_preserved(self) -> None:
        context = normalize_game_auth({"tgt": "ticket-granting-ticket", "guid": "12345"})
        self.assertEqual(context["guid"], "12345")

        client, _ = client_with(FakeResponse())
        client.game_auth = context
        self.assertEqual(client.snapshot()["gameAuth"], context)

        with self.assertRaisesRegex(ApiClientError, "context is invalid"):
            normalize_game_auth({"tgt": "", "guid": "12345"})

    def test_teleport_login_keeps_game_refresh_context_in_protected_snapshot(
        self,
    ) -> None:
        client, _ = client_with(FakeResponse())
        client.session.cookies.set(
            "web_guidid", "67890", domain="login.u.sdo.com", path="/"
        )

        preserve_game_auth(client, {"data": {"tgt": "game-tgt"}})

        self.assertEqual(
            client.snapshot()["gameAuth"],
            {"tgt": "game-tgt", "guid": "67890"},
        )

    def test_request_applies_shared_headers_and_timeout(self) -> None:
        client, session = client_with(FakeResponse())

        client.request("GET", "https://example.invalid", headers={"Referer": "test"})

        _, _, arguments = session.arguments
        self.assertEqual(arguments["timeout"], 20)
        self.assertEqual(arguments["headers"]["User-Agent"], BASE_HEADERS["User-Agent"])
        self.assertEqual(arguments["headers"]["Referer"], "test")

    def test_http_errors_are_translated_without_exposing_the_url(self) -> None:
        client, _ = client_with(FakeResponse(status_code=503))

        with self.assertRaisesRegex(ApiClientError, r"API unavailable\. \(HTTP 503\)"):
            client.request(
                "GET",
                "https://secret.invalid/path",
                error_message="API unavailable.",
            )

    def test_transport_errors_use_safe_copy(self) -> None:
        client, _ = client_with(RuntimeError("https://secret.invalid/token"))

        with self.assertRaisesRegex(ApiClientError, "Safe network error") as context:
            client.request(
                "GET",
                "https://secret.invalid/path",
                error_message="Safe network error",
            )
        self.assertNotIn("secret.invalid", str(context.exception))

    def test_response_size_limit_is_enforced(self) -> None:
        client, _ = client_with(FakeResponse(content=b"1234"))

        with self.assertRaisesRegex(ApiClientError, "exceeded the size limit"):
            client.request("GET", "https://example.invalid", max_bytes=3)

    def test_glamour_request_omits_empty_filters(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_page(
            client,
            {"page": 1, "limit": 12, "order": "latest"},
        )

        _, _, arguments = session.arguments
        self.assertEqual(
            arguments["params"],
            {"page": 1, "limit": 12, "order": "latest"},
        )

    def test_glamour_hot_request_omits_order(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_page(client, {"page": 1, "limit": 12})

        _, _, arguments = session.arguments
        self.assertEqual(arguments["params"], {"page": 1, "limit": 12})

    def test_glamour_request_includes_selected_filters(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_page(
            client,
            {
                "page": 1,
                "limit": 12,
                "order": "latest",
                "raceId": 4,
                "genderId": 2,
            },
        )

        _, _, arguments = session.arguments
        self.assertEqual(arguments["params"]["race_id"], 4)
        self.assertEqual(arguments["params"]["gender_id"], 2)

    def test_glamour_title_search_uses_the_common_search_contract(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_page(
            client,
            {
                "page": 1,
                "limit": 20,
                "order": "latest",
                "raceId": 4,
                "genderId": 2,
                "keywords": "summer",
            },
        )

        _, url, arguments = session.arguments
        self.assertEqual(url, GLAMOUR_SEARCH_URL)
        self.assertEqual(arguments["params"]["type"], 7)
        self.assertEqual(arguments["params"]["keywords"], "summer")
        self.assertTrue(arguments["params"]["tempsuid"])
        self.assertNotIn("searchByEquipment", arguments["params"])
        self.assertNotIn("race_id", arguments["params"])
        self.assertNotIn("gender_id", arguments["params"])

    def test_glamour_equipment_search_sends_the_selected_item_id(self) -> None:
        resolved_url = f"{GLAMOUR_SEARCH_URL}?page=1&keywords=1129"
        client, session = client_with(FakeResponse(url=resolved_url))

        result = fetch_glamour_page(
            client,
            {
                "page": 1,
                "limit": 20,
                "order": "latest",
                "keywords": "1129",
                "searchByEquipment": True,
            },
        )

        _, url, arguments = session.arguments
        self.assertEqual(url, GLAMOUR_SEARCH_URL)
        self.assertEqual(arguments["params"]["keywords"], "1129")
        self.assertEqual(arguments["params"]["searchByEquipment"], 1)
        self.assertEqual(result["url"], resolved_url)

    def test_glamour_detail_sends_identifier_and_temporary_id(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_detail(client, {"id": 287009})

        _, _, arguments = session.arguments
        self.assertEqual(arguments["params"]["id"], 287009)
        self.assertTrue(arguments["params"]["tempsuid"])

    def test_recruitment_page_sends_public_filters_without_team_composition(self) -> None:
        client, session = client_with(FakeResponse())

        result = fetch_recruit_page(
            client,
            {
                "page": 2,
                "limit": 9,
                "dutyName": "Duty",
                "dutyType": "Ultimate",
                "targetAreaId": 1,
            },
        )

        _, url, arguments = session.arguments
        self.assertEqual(url, RECRUIT_LIST_URL)
        self.assertEqual(arguments["params"]["page"], 2)
        self.assertEqual(arguments["params"]["limit"], 9)
        self.assertEqual(arguments["params"]["fb_name"], "Duty")
        self.assertEqual(arguments["params"]["fb_type"], "Ultimate")
        self.assertEqual(arguments["params"]["position"], "")
        self.assertEqual(arguments["params"]["team_composition"], "")
        self.assertEqual(arguments["params"]["target_area_id"], 1)
        self.assertTrue(arguments["params"]["tempsuid"])
        self.assertEqual(result["url"], RECRUIT_LIST_URL)

    def test_teleport_roles_use_only_the_selected_official_server(self) -> None:
        client, session = client_with(FakeResponse())

        result = fetch_teleport(
            client,
            {"action": "roles", "areaId": 1, "groupId": 30},
        )

        method, url, arguments = session.arguments
        self.assertEqual(method, "GET")
        self.assertEqual(url, f"{TELEPORT_ORIGIN}{TELEPORT_ENDPOINTS['roles']}")
        self.assertEqual(
            arguments["params"],
            {"appId": 100001900, "areaId": 1, "groupId": 30},
        )
        self.assertIn("session", result)

    def test_teleport_push_uses_the_service_specific_cas_application(self) -> None:
        ok = b'sdoCallback({"return_code":0,"data":{}})'
        configured = (
            b'sdoCallback({"return_code":0,"data":{"bizContext":"context"}})'
        )
        client, session = client_with(
            [
                FakeResponse(),
                FakeResponse(content=ok),
                FakeResponse(content=configured),
                FakeResponse(content=ok),
                FakeResponse(content=ok),
            ]
        )

        result = start_teleport_push(client, {"account": "13800138000"})

        _, url, arguments = session.arguments
        self.assertEqual(url, "https://w.cas.sdo.com/authen/sendPushMessage.jsonp")
        self.assertEqual(arguments["params"]["appId"], 100001900)
        self.assertEqual(arguments["params"]["areaId"], 1001)
        self.assertEqual(arguments["params"]["inputUserId"], "13800138000")
        self.assertEqual(result["status"], "awaiting_confirmation")

    def test_teleport_order_serializes_the_selected_role_as_a_string_id(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_teleport(
            client,
            {
                "action": "createOrder",
                "areaId": 1,
                "areaName": "Source Area",
                "groupId": 30,
                "groupCode": "SourceWorld",
                "groupName": "Source World",
                "targetAreaId": 7,
                "targetAreaName": "Target Area",
                "targetGroupId": 6,
                "targetGroupCode": "TargetWorld",
                "targetGroupName": "Target World",
                "role": {
                    "roleId": "123456789012345678",
                    "roleName": "Test Role",
                    "key": 2,
                },
            },
        )

        _, url, arguments = session.arguments
        role_list = json.loads(arguments["params"]["roleList"])
        self.assertEqual(url, f"{TELEPORT_ORIGIN}{TELEPORT_ENDPOINTS['createOrder']}")
        self.assertEqual(role_list[0]["roleId"], "123456789012345678")
        self.assertEqual(arguments["params"]["migrationType"], 4)

    def test_teleport_rejects_untrusted_codes_and_order_identifiers(self) -> None:
        client, _ = client_with(FakeResponse())

        with self.assertRaisesRegex(ApiClientError, "group code is invalid"):
            fetch_teleport(
                client,
                {
                    "action": "travelBack",
                    "orderId": "GM017624121826083122310200001263",
                    "groupId": 6,
                    "groupCode": "world&admin=1",
                    "groupName": "World",
                },
            )
        with self.assertRaisesRegex(ApiClientError, "order identifier is invalid"):
            fetch_teleport(client, {"action": "orderStatus", "orderId": "../../x"})

    def test_avatar_request_uses_official_headers_and_returns_a_data_url(self) -> None:
        avatar_url = (
            "https://ff14risingstones.gcloud.com.cn/avatar/2026/user/avatar.jpeg"
        )
        client, session = client_with(
            FakeResponse(
                content=b"jpeg-bytes",
                url=avatar_url,
                headers={"content-type": "image/jpeg"},
            )
        )

        result = fetch_avatar(client, {"url": avatar_url})

        method, url, arguments = session.arguments
        self.assertEqual(method, "GET")
        self.assertEqual(url, avatar_url)
        self.assertEqual(
            arguments["headers"]["Referer"],
            "https://ff14risingstones.web.sdo.com/",
        )
        self.assertEqual(arguments["headers"]["Sec-Fetch-Dest"], "image")
        self.assertTrue(result["dataUrl"].startswith("data:image/jpeg;base64,"))

    def test_avatar_request_accepts_the_default_image_path(self) -> None:
        avatar_url = (
            "https://ff14risingstones.gcloud.com.cn/default/2026/user/avatar.jpeg"
        )
        client, session = client_with(
            FakeResponse(
                content=b"jpeg-bytes",
                url=avatar_url,
                headers={"content-type": "image/jpeg"},
            )
        )

        result = fetch_avatar(client, {"url": avatar_url})

        self.assertEqual(session.arguments[1], avatar_url)
        self.assertTrue(result["dataUrl"].startswith("data:image/jpeg;base64,"))

    def test_avatar_request_rejects_non_allowlisted_urls(self) -> None:
        client, _ = client_with(FakeResponse())

        with self.assertRaisesRegex(ApiClientError, "avatar URL is not supported"):
            fetch_avatar(client, {"url": "https://example.com/avatar/user.jpeg"})

    def test_wiki_request_uses_encoded_item_name_and_detects_success(self) -> None:
        item_name = "\u6d4b\u8bd5\u624b\u5957"
        client, session = client_with(
            FakeResponse(
                content=f"<title>Item:{item_name}</title>{item_name}".encode(),
            )
        )

        result = fetch_wiki_page({"itemName": item_name}, session)

        method, url, arguments = session.arguments
        self.assertEqual(method, "GET")
        self.assertIn("%E7%89%A9%E5%93%81%3A", url)
        self.assertIn("%E6%B5%8B%E8%AF%95%E6%89%8B%E5%A5%97", url)
        self.assertIn("ItemSearch", arguments["headers"]["Referer"])
        self.assertFalse(result["challenged"])

    def test_wiki_request_detects_cloudflare_challenge(self) -> None:
        client, session = client_with(
            FakeResponse(
                status_code=403,
                content=b"<title>Just a moment...</title>",
                headers={"cf-mitigated": "challenge"},
            )
        )

        result = fetch_wiki_page({"itemName": "Test"}, session)

        self.assertTrue(result["challenged"])

    def test_wiki_request_constructs_the_configured_safari_session(self) -> None:
        item_name = "\u6d4b\u8bd5\u624b\u5957"
        session = FakeSession(
            FakeResponse(content=f"<title>Item:{item_name}</title>{item_name}".encode())
        )

        with patch("api_client.requests.Session", return_value=session) as factory:
            result = fetch_wiki_page({"itemName": item_name})

        factory.assert_called_once_with(impersonate=WIKI_IMPERSONATE)
        self.assertFalse(result["challenged"])

    def test_login_requires_the_official_character_binding(self) -> None:
        client, _ = client_with(
            [
                FakeResponse(
                    content=json.dumps(
                        {
                            "code": 10000,
                            "data": {"displayAccount": "account"},
                        }
                    ).encode()
                ),
                FakeResponse(
                    content=json.dumps({"code": 10103, "data": []}).encode()
                ),
            ]
        )

        result = finalize_authenticated_login(client)

        self.assertEqual(result["status"], "binding_required")
        self.assertEqual(result["profile"]["characterName"], "")

    def test_login_treats_the_official_unbound_status_as_authenticated(self) -> None:
        client, _ = client_with(
            FakeResponse(
                content=json.dumps({"code": 10103, "data": []}).encode()
            )
        )

        result = finalize_authenticated_login(client)

        self.assertEqual(result["status"], "binding_required")

    def test_login_merges_the_bound_character_profile(self) -> None:
        client, _ = client_with(
            [
                FakeResponse(
                    content=json.dumps(
                        {
                            "code": 10000,
                            "data": {"displayAccount": "account"},
                        }
                    ).encode()
                ),
                FakeResponse(
                    content=json.dumps(
                        {
                            "code": 10000,
                            "data": {
                                "character_name": "Character",
                                "area_name": "Area",
                                "group_name": "Group",
                            },
                        }
                    ).encode()
                ),
            ]
        )

        result = finalize_authenticated_login(client)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["profile"]["characterName"], "Character")

if __name__ == "__main__":
    unittest.main()
