import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@/api-client";

import App from "./App";
import "./index.css";

setBaseUrl(import.meta.env.VITE_API_URL || "http://localhost:3001");

createRoot(document.getElementById("root")!).render(<App />);