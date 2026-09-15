/** Mount the selected desktop or browser entrypoint. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/styles/index.css";
import { Entrypoint } from "./app/Entrypoint";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Entrypoint />
  </StrictMode>,
);
