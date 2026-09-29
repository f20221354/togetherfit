import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "स्वस्थ Bharat",
    short_name: "स्वस्थ Bharat",
    start_url: "/",
    display: "standalone",
    background_color: "#071A16",
    theme_color: "#087443",
    icons: [
      { src: "/brand/icon-light-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-light-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-light.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
