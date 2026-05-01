/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: [
      'hrzocvlnawuwgqeefckq.supabase.co',
      'replicate.delivery',
      'pbxt.replicate.delivery',
    ],
  },
}
module.exports = nextConfig
