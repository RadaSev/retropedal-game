/** @type {import('next').NextConfig} */

// Detectar si estamos en GitHub Pages
const isGithubPages = process.env.GITHUB_ACTIONS === "true"
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || ""

const nextConfig = {
  // Configuración para exportación estática
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // Configuración de imágenes para exportación estática
  images: {
    unoptimized: true,
  },

  // Configuración para GitHub Pages
  ...(isGithubPages &&
    repoName && {
      assetPrefix: `/${repoName}/`,
      basePath: `/${repoName}`,
    }),

  // Configuración de compilación
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuración experimental
  experimental: {
    esmExternals: false,
  },

  // Headers para mejor compatibilidad
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
