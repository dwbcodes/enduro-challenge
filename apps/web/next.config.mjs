/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',       // Static export → S3/CloudFront
  trailingSlash: true,    // index.html per route for S3 compatibility
  transpilePackages: ['@enduro/domain'],
  images: {
    unoptimized: true,    // No Next.js image optimisation in static export
  },
};

export default nextConfig;
