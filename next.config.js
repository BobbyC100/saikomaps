/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'maps.googleapis.com',
      // Add your image CDN domains here
    ],
  },
  // Enable strict mode for better development experience
  reactStrictMode: true,
}

module.exports = nextConfig
