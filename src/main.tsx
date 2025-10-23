import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from '@capacitor/app';

// Handle Android back button
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    CapacitorApp.exitApp();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
