/** Dedicated React entrypoint for the phone chat client. */
import { createRoot } from "react-dom/client";
import { MobileChatApp } from "./MobileChatApp";
import "./mobile.css";

createRoot(document.getElementById("mobile-root")!).render(<MobileChatApp />);
