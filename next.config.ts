import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-pty", "ssh2"],
  allowedDevOrigins: ["http://192.168.36.150:3000"],
};

export default nextConfig;
