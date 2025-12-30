/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Adding options to help with the build
  poweredByHeader: false,
  // Disable image optimization for external URLs (like avatar images)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fabxmporizzqflnftavs.supabase.co',
      },
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;
