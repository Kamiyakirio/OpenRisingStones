import unittest

from api_client import (
    ApiClient,
    ApiClientError,
    BASE_HEADERS,
    fetch_glamour_detail,
    fetch_glamour_page,
)


class FakeResponse:
    def __init__(self, status_code: int = 200, content: bytes = b"{}") -> None:
        self.status_code = status_code
        self.content = content


class FakeSession:
    def __init__(self, response: FakeResponse | Exception) -> None:
        self.response = response
        self.arguments = None

    def request(self, method, url, **kwargs):
        self.arguments = (method, url, kwargs)
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


def client_with(response: FakeResponse | Exception) -> tuple[ApiClient, FakeSession]:
    client = ApiClient.__new__(ApiClient)
    session = FakeSession(response)
    client.session = session
    return client, session


class ApiClientTests(unittest.TestCase):
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

    def test_glamour_detail_sends_identifier_and_temporary_id(self) -> None:
        client, session = client_with(FakeResponse())

        fetch_glamour_detail(client, {"id": 287009})

        _, _, arguments = session.arguments
        self.assertEqual(arguments["params"]["id"], 287009)
        self.assertTrue(arguments["params"]["tempsuid"])


if __name__ == "__main__":
    unittest.main()
