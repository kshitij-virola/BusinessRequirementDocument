import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable React Strict Mode in development.
  // Strict Mode intentionally double-invokes renders and effects to surface
  // side effects, which causes SWR hooks to appear to fire twice in the
  // network tab. Turning it off keeps API call counts accurate during dev.
  reactStrictMode: false,
}

export default nextConfig;
