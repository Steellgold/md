import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NextConfig } from "next";

const rootDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: rootDirectory,
  turbopack: {
    root: rootDirectory,
  },
};

export default nextConfig;
