/** @type {import('next').NextConfig} */
const nextConfig = {
  // pacotes do monorepo são transpilados pelo Next
  transpilePackages: [
    "@icp/core",
    "@icp/config",
    "@icp/db",
    "@icp/logger",
    "@icp/queue",
    "@icp/secrets",
  ],
  // deps nativas de Node usadas só no server (rotas API) — não bundlar
  serverExternalPackages: ["@prisma/client", "bullmq", "ioredis"],
};

export default nextConfig;
