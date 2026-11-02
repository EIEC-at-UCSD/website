import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...["projects", "events"].map((page) => ({
        source: `/${page}.html`, destination: `/${page}`, permanent: true,
      })),
      // Recruitment is paused; the page is archived (see _archive/recruitment/RESTORE.md).
      { source: "/recruitment", destination: "/", permanent: false },
      { source: "/recruitment.html", destination: "/", permanent: false },
      // The 2026 hackathon page is archived (see _archive/hackathon-2026/RESTORE.md).
      { source: "/hackathon", destination: "/", permanent: false },
      { source: "/hackathon/index.html", destination: "/", permanent: false },
    ];
  },
};

export default config;
