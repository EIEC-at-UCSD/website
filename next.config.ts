import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...["projects", "events", "recruitment"].map((page) => ({
        source: `/${page}.html`, destination: `/${page}`, permanent: true,
      })),
      { source: "/hackathon/index.html", destination: "/hackathon", permanent: true },
    ];
  },
};

export default config;
