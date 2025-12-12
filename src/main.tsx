import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment (needed for gray-matter)
// @ts-ignore
globalThis.Buffer = Buffer;
import App from "./App";
import { migrateLegacyStorage } from "./lib/migrateLegacyStorage";

// Run one-time migration from Amber to Moss
migrateLegacyStorage();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
