import type {NextConfig} from "next";

const nextConfig:NextConfig={
  output:"standalone",
  poweredByHeader:false,
  compress:true,
  images:{formats:["image/avif","image/webp"],minimumCacheTTL:86400,imageSizes:[32,48,64,96,128,256]},
  async headers(){return[
    {source:"/_next/static/:path*",headers:[{key:"Cache-Control",value:"public, max-age=31536000, immutable"}]},
    {source:"/icons/:path*",headers:[{key:"Cache-Control",value:"public, max-age=31536000, immutable"}]},
  ]},
};

export default nextConfig;
