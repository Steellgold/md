import { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: rootDirectory,
  },
};

export default nextConfig;
