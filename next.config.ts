import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Requests pass through the dashboard proxy before Server Actions.
    proxyClientMaxBodySize: "210mb",
    serverActions: {
      // Portfolio videos are capped at 200 MB; leave room for multipart metadata.
      bodySizeLimit: "210mb",
    },
  },
};

export default nextConfig;
