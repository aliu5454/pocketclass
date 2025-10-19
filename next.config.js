/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: { 
     remotePatterns: [
    {
      protocol: 'https',
      
      hostname: '*',
    },
    {
      protocol: 'http',
      hostname: '*',
    },
  
  ],
  
    domains: ["images.unsplash.com", "links.papareact.com", "content.active.com", "plus.unsplash.com",
      "lh3.googleusercontent.com","firebasestorage.googleapis.com"],
  },
  env: {
    mapbox_key:
      "pk.eyJ1IjoiYWxpdTU0NTQiLCJhIjoiY2w3bWo3cnRtMGQzMjN1bnc5cWY2dGV3MCJ9.7vIY5f950OKxv97mWQY8GQ",
  },
  async redirects() {
    return [
      {
        source: '/pay',
        destination: 'https://pocket-class-dashboard.lovable.app/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
