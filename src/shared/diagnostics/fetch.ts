/** Instruments WebView fetch once, including calls made outside feature API modules. */
import { canCapture, captureRecord, encodeBinary } from "./capture.ts";

let installed = false;

export function installFetchCapture() {
  if (installed || !canCapture()) return;
  installed = true;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const requestedUrl = input instanceof Request ? input.url : String(input);
    let url: URL;
    try {
      url = new URL(requestedUrl, location.href);
    } catch {
      return originalFetch(input, init);
    }
    // Windows transports Tauri IPC over HTTP(S), including captureRecord itself.
    // Exclude that host before reading bodies to prevent recursive log capture.
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.hostname === "ipc.localhost"
    ) {
      return originalFetch(input, init);
    }
    const started = performance.now();
    let request: ReturnType<typeof readRequest>;
    try {
      request = readRequest(input, init);
    } catch {
      return originalFetch(input, init);
    }
    try {
      const response = await originalFetch(input, init);
      try {
        void captureResponse(request, response.clone(), started);
      } catch {
        // A failed clone must not replace a successful network response.
      }
      return response;
    } catch (error) {
      void request.body
        .catch((reason) => ({ type: "capture-error", message: String(reason) }))
        .then((body) =>
          captureRecord({
            kind: "network",
            source: "webview",
            name:
              request.method +
              " " +
              new URL(request.url, location.href).pathname,
            outcome: "error",
            durationMs: performance.now() - started,
            request: { ...request, body },
            error: { message: String(error) },
          }),
        );
      throw error;
    }
  };
}

function readRequest(input: RequestInfo | URL, init?: RequestInit) {
  const source = input instanceof Request ? input : null;
  const url = source?.url ?? String(input);
  const headers = new Headers(source?.headers);
  if (init?.headers)
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return {
    method: (init?.method ?? source?.method ?? "GET").toUpperCase(),
    url,
    headers: [...headers.entries()],
    params: [...new URL(url, location.href).searchParams.entries()],
    body: readRequestBody(source, init),
  };
}

async function readRequestBody(source: Request | null, init?: RequestInit) {
  if (init?.body != null)
    return readBody(init.body, new Headers(init.headers).get("content-type"));
  if (!source?.body) return null;
  const bytes = new Uint8Array(await source.clone().arrayBuffer());
  return decodeBody(bytes, source.headers.get("content-type"));
}

async function readBody(
  body: BodyInit,
  contentType: string | null,
): Promise<unknown> {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    return Promise.all(
      [...body.entries()].map(async ([key, value]) => [
        key,
        typeof value === "string"
          ? value
          : encodeBinary(new Uint8Array(await value.arrayBuffer()), value.type),
      ]),
    );
  }
  if (body instanceof Blob) {
    return decodeBody(
      new Uint8Array(await body.arrayBuffer()),
      body.type || contentType,
    );
  }
  if (body instanceof ArrayBuffer)
    return decodeBody(new Uint8Array(body), contentType);
  if (ArrayBuffer.isView(body)) {
    return decodeBody(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
      contentType,
    );
  }
  return { type: "stream-body" };
}

async function captureResponse(
  request: ReturnType<typeof readRequest>,
  response: Response,
  started: number,
) {
  const body = await request.body.catch((reason) => ({
    type: "capture-error",
    message: String(reason),
  }));
  try {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    await captureRecord({
      kind: "network",
      source: "webview",
      name: request.method + " " + new URL(request.url, location.href).pathname,
      outcome: response.ok ? "success" : "error",
      durationMs: performance.now() - started,
      request: { ...request, body },
      response: {
        status: response.status,
        url: response.url,
        headers: [...response.headers.entries()],
        body: decodeBody(bytes, contentType),
      },
    });
  } catch (error) {
    await captureRecord({
      kind: "network",
      source: "webview",
      name: request.method + " " + new URL(request.url, location.href).pathname,
      outcome: "error",
      durationMs: performance.now() - started,
      request: { ...request, body },
      error: { message: String(error) },
    });
  }
}

function decodeBody(bytes: Uint8Array, contentType: string | null) {
  if (/json|text|xml|javascript|svg|form-urlencoded/i.test(contentType ?? "")) {
    return new TextDecoder().decode(bytes);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    JSON.parse(text);
    return text;
  } catch {
    // Unknown binary content remains an attachment in the detail view.
  }
  return encodeBinary(bytes, contentType ?? undefined);
}
