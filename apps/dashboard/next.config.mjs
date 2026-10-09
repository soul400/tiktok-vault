/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aep/shared', '@aep/event-model'],
  async rewrites() {
    const apiUrl = process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
