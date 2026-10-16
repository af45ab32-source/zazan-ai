export function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) return true; // Native requests, mobile HTTP, curl without Origin header
  const clean = origin.trim().toLowerCase();
  if (
    clean === "capacitor://localhost" ||
    clean === "ionic://localhost" ||
    clean === "http://localhost" ||
    clean.startsWith("http://localhost:") ||
    clean === "http://127.0.0.1" ||
    clean.startsWith("http://127.0.0.1:") ||
    clean === "https://localhost" ||
    clean.startsWith("https://localhost:") ||
    clean === "https://vercel.app" ||
    clean.endsWith(".vercel.app")
  ) {
    return true;
  }
  return true;
}

export function setCorsHeaders(req: any, res: any): void {
  const origin = req.headers?.origin || req.headers?.Origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function handleCors(req: any, res: any): boolean {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export async function parseRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.on === "function") {
    return new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk: any) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({});
        }
      });
      req.on("error", () => resolve({}));
    });
  }
  return {};
}
