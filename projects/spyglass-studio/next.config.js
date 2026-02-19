/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'api.repliers.io',
      'cdn.repliers.io',
      // Add other image domains as needed
    ],
  },
  env: {
    REPLIERS_API_URL: process.env.REPLIERS_API_URL,
    REPLIERS_API_KEY: process.env.REPLIERS_API_KEY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
}

module.exports = nextConfig