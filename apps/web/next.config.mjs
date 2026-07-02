import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  return {
    output: 'export',       // Static export -> S3/CloudFront
    trailingSlash: true,    // index.html per route for S3 compatibility
    transpilePackages: ['@enduro/domain'],
    images: {
      unoptimized: true,    // No Next.js image optimisation in static export
    },
    ...(isDev
      ? {
          async rewrites() {
            return [
              {
                source: '/api/:path*',
                destination: 'https://uwgohasssb.execute-api.us-west-2.amazonaws.com/:path*',
              },
            ];
          },
        }
      : {}),
  };
}
