import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Uploads go through a Server Action, whose body limit defaults to 1 MB —
    // well under the 5 MB MAX_UPLOAD_BYTES the documents page advertises. The
    // headroom covers multipart encoding overhead on a max-size file.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
