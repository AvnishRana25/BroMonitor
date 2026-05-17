/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudinary-hosted images (daily log evidence + doubt images) are loaded
  // directly from the CDN. Next/Image needs a remotePatterns entry for that.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  // Trim the server bundle: cloudinary's huge cjs index loads lots of
  // optional adapters we don't use.
  experimental: {
    serverComponentsExternalPackages: ["cloudinary"],
    // Camera/gallery uploads exceed the default 1 MB Server Action limit.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
