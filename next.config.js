/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["links.papareact.com"]
  },
  env: {
    mapbox_key: 'pk.eyJ1IjoiYWxpdTU0NTQiLCJhIjoiY2w3bWo3cnRtMGQzMjN1bnc5cWY2dGV3MCJ9.7vIY5f950OKxv97mWQY8GQ'
  }
}

module.exports = nextConfig
