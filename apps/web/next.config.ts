import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@autoforge/db", "@autoforge/shared"],
};

export default nextConfig;
