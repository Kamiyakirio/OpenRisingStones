/** Dedicated React entrypoint for the phone chat client. */
import { createRoot } from "react-dom/client";
import "../shared/styles/tailwind.css";
import { MobileChatApp } from "./MobileChatApp";

createRoot(document.getElementById("mobile-root")!).render(<MobileChatApp />);
