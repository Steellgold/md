import { Suspense } from "react";

import { MarkdownApp } from "@/components/markdown-app";

export default function CatchAllPage() {
  return (
    <Suspense fallback={null}>
      <MarkdownApp />
    </Suspense>
  );
}
