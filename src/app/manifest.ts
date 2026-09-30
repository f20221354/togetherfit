import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "togetherfit",
    short_name: "togetherfit",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2CB144",
    icons: [
      { src: "/brand/icon-light-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-light-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
