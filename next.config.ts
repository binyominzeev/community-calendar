import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/better-sqlite3/**/*",
      "./node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3/**/*",
    ],
  },
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/better-sqlite3/deps/**",
      "./node_modules/better-sqlite3/src/**",
      "./node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3/deps/**",
      "./node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3/src/**",
    ],
  },
};

export default nextConfig;
