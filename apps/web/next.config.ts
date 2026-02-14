import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@omakase/db", "@omakase/shared"],
};

export default nextConfig;
