import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ToastProvider } from "./context/ToastContext";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
        <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
);
