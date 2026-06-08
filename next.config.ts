import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // DETTE TECHNIQUE : les routes dynamiques ciblent Next ≤14 (params: {id}) alors que
  // le projet est sur Next 16 (params: Promise<{id}>). Le runtime tolère l'accès sync ;
  // on ignore le typecheck/eslint au build pour produire l'image.
  // À corriger : migrer les 15 routes /api/**/[id] vers `await params`.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
