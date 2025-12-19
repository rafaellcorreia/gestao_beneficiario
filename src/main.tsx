import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  createRoot(rootElement).render(<App />);
} catch (error: unknown) {
  console.error('Falha ao iniciar o app', error);
  const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
  document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">
    <h1>Erro ao carregar aplicação</h1>
    <p>${errorMessage}</p>
  </div>`;
}
