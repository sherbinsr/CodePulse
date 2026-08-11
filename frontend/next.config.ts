import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "www.gravatar.com" },
      { protocol: "https", hostname: "gravatar.com" },
      { protocol: "https", hostname: "gitlab.com" },
      { protocol: "https", hostname: "*.gitlabstatic.com" },
    ],
  },
};

export default nextConfig;
