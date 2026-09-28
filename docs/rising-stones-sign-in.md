# Rising Stones automatic check-in

The desktop app submits one daily check-in after `sdo_login_status` confirms a bound character. A new login in the same app session also triggers it. The home page shows a pending state, a successful or already-signed check mark, or a failed mark with a retry button. Closing and reopening the app submits again; the server's already-signed response is treated as success.

The Tauri command `sdo_sign_in` accepts no cookie argument and reads only the active, verified Rust session. The Python sidecar sends `POST /api/home/sign/signIn` to the allowlisted Rising Stones host using that session's saved User-Agent and cookies. It generates separate random `tempsuid` values for the query and form body, matching the supplied browser request and the [original check-in client implementation](https://github.com/StarHeartHunt/ff14risingstone_sign_task/blob/master/src/client.py). Browser fingerprint headers remain the existing API client's responsibility.

The sidecar returns only `signed` for business code `10000` and `already_signed` for `10001`. Other codes, invalid JSON, and HTTP or network failures return an error; no raw private response enters the webview. The response-code interpretation follows the original check-in client and needs confirmation with an authenticated desktop session before release.

Verification: `python3 -m unittest discover -s src-tauri/python -p 'test_api_client.py'`, `cargo check --manifest-path src-tauri/Cargo.toml`, `npm run build`, and `npm run lint`. A live signed-in request was not run during implementation.
