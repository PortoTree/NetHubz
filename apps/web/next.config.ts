import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  allowedDevOrigins: ["192.168.1.120", "100.121.213.123", "localhost", "127.0.0.1", "*"],
  devIndicators: false,
};

export default withNextIntl(nextConfig);
