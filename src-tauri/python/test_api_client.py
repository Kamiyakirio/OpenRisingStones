import json
import os
import unittest
from contextlib import redirect_stderr
from io import StringIO
from unittest.mock import patch

from api_client import (
    ApiClient,
    ApiClientError,
    BASE_HEADERS,
    GLAMOUR_SEARCH_URL,
    NETWORK_CONSOLE_PREFIX,
    fetch_glamour_detail,
    fetch_glamour_page,
    finalize_authenticated_login,
    normalize_user_agent,
)


class FakeResponse:
    def __init__(
        self,
        status_code: int = 200,
        content: bytes = b"{}",
        url: str | None = None,
    ) -> None:
        self.status_code = status_code
        self.content = content
        self.url = url

    def json(self):
        return json.loads(self.content)


class FakeCookies:
    jar = []


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


def client_with(
    response: FakeResponse | Exception | list,
) -> tuple[ApiClient, FakeSession]:
    client = ApiClient.__new__(ApiClient)
    session = FakeSession(response)
    client.session = session
    client.user_agent = BASE_HEADERS["User-Agent"]
    client.base_headers = BASE_HEADERS
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
        client, session = client_with(FakeResponse())

        fetch_glamour_page(
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

    def test_glamour_detail_sends_identifier_and_temporary_id(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_detail(client, {"id": 287009})

        _, _, arguments = session.arguments
        self.assertEqual(arguments["params"]["id"], 287009)
        self.assertTrue(arguments["params"]["tempsuid"])

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
