"""用 curl_cffi 模拟 Chrome 指纹读取石之家幻化列表。

脚本只接受分页与筛选字段；接口地址和请求头固定，不发送或持久化 Cookie。
"""

import json
import sys

from curl_cffi import requests


ENDPOINT = "https://apiff14risingstones.web.sdo.com/api/home/glamour/glamoursList"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def main() -> None:
    request = json.load(sys.stdin)
    response = requests.get(
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
        impersonate="chrome",
        allow_redirects=False,
        discard_cookies=True,
        timeout=20,
    )
    body = response.content
    if len(body) > MAX_RESPONSE_BYTES:
        raise RuntimeError("石之家响应超过大小限制")
    result = {"status": response.status_code, "body": body.decode("utf-8")}
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except ModuleNotFoundError:
        print("缺少 curl_cffi，请安装 python/requirements.txt", file=sys.stderr)
        raise SystemExit(1)
    except Exception as error:  # 只向 Rust 返回简短错误，不暴露 Python 回溯和本地路径。
        print(f"curl_cffi 请求失败：{error}", file=sys.stderr)
        raise SystemExit(1)
