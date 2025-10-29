import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function showBanner(message: string) {
  const el = document.createElement('div');
  el.style.cssText = 'padding:12px;background:#eef;border:1px solid #99f;color:#003;margin:8px;font-family:system-ui,Segoe UI,Arial';
  el.textContent = message;
  document.body.prepend(el);
}

try {
  const baseUrl = import.meta.env.BASE_URL;
  // @ts-ignore
  const runtimeEnv = (typeof window !== 'undefined' && window.__ENV__) || {};
  console.log('App boot', { baseUrl, runtimeEnvKeys: Object.keys(runtimeEnv) });
  showBanner('Aplicativo iniciando...');
  createRoot(document.getElementById("root")!).render(<App />);
} catch (e: any) {
  const msg = e?.message || String(e);
  const el = document.createElement('div');
  el.style.cssText = 'padding:12px;background:#fee;border:1px solid #f99;color:#900;margin:8px;font-family:system-ui,Segoe UI,Arial';
  el.textContent = 'Falha ao iniciar o app: ' + msg;
  document.body.prepend(el);
  console.error('Falha ao iniciar o app', e);
}
