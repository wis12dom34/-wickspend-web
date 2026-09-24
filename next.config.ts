import type {NextConfig} from "next";

const nextConfig:NextConfig={
  poweredByHeader:false,
  compress:true,
  images:{formats:["image/avif","image/webp"],minimumCacheTTL:86400,imageSizes:[32,48,64,96,128,256]},
  async headers(){return[
    {source:"/_next/static/:path*",headers:[{key:"Cache-Control",value:"public, max-age=31536000, immutable"}]},
    {source:"/icons/:path*",headers:[{key:"Cache-Control",value:"public, max-age=31536000, immutable"}]},
    {source:"/admin/:path*",headers:[
      {key:"Cache-Control",value:"no-store, max-age=0, must-revalidate"},
      {key:"Pragma",value:"no-cache"},
      {key:"Expires",value:"0"},
    ]},
    {source:"/staff/:path*",headers:[
      {key:"Cache-Control",value:"no-store, max-age=0, must-revalidate"},
      {key:"Pragma",value:"no-cache"},
      {key:"Expires",value:"0"},
    ]},
  ]},
};

export default nextConfig;
