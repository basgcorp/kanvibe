import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-pty", "ssh2"],
  allowedDevOrigins: ["http://192.168.36.150:4885"],
};

export default withNextIntl(nextConfig);
