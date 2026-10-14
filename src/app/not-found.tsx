import type { Metadata } from "next";
import { StatusScreen } from "@/components/ui/StatusScreen";

export const metadata: Metadata = { title: "Page not found · togetherfit" };

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-background">
      <StatusScreen code="404" title="This page doesn't exist" message="The link may be old, or the page was moved. Check the address, or head back home." />
    </main>
  );
}
