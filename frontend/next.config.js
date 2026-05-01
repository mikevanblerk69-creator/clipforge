/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'your-project.supabase.co',
      'hrzocvlnawuwgqeefckq.supabase.co',
      'replicate.delivery',
      'pbxt.replicate.delivery',
    ],
  },
}

module.exports = nextConfig
