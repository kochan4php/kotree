import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default withPWA(nextConfig);
