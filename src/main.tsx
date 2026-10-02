import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CompanionWindow } from "./components/CompanionWindow";
import "./styles.css";
import "katex/dist/katex.min.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).has("companion") ? <CompanionWindow /> : <App />}
  </React.StrictMode>,
);
