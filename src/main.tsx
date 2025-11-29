import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { migrateLegacyStorage } from "./lib/migrateLegacyStorage";

// Run one-time migration from Amber to Moss
migrateLegacyStorage();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
