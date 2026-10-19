/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: '.',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/privacy.html',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

