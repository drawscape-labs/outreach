import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Keep `next build` from replacing the client assets used by a running dev
  // server. The two processes otherwise share `.next` and can leave the UI
  // rendered but unhydrated after a verification build.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  turbopack: {
    root: path.resolve(webRoot, "..")
  }
};

export default nextConfig;
