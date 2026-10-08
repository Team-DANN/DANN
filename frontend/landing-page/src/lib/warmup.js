import { API_BASE_URL } from "./config.js";

let warmPromise = null;

async function poll(maxMs = 70000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
      // Any non-5xx response means the server is awake (502/503 = still booting)
      if (res.status < 500) return true;
    } catch {
      // network/CORS error while the server boots, try again
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export function warmUpServer() {
  if (!warmPromise) warmPromise = poll();
  return warmPromise;
}