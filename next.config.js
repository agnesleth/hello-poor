/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'], // Add this if you'll be loading images from Firebase Storage
  },
}

module.exports = nextConfig 