/** Mount the selected desktop or browser entrypoint. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/styles/index.css";
import { Entrypoint } from "./app/Entrypoint";
import { installFetchCapture } from "./shared/diagnostics/fetch";

if (__DEBUG_BUILD__) installFetchCapture();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Entrypoint />
  </StrictMode>,
);
