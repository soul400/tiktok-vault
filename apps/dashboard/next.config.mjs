/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const activeTunnel = 'https://attacks-debut-inquiries-startup.trycloudflare.com';
    const apiUrl = activeTunnel || process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
