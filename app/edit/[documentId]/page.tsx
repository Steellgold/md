import { MarkdownApp } from "@/components/markdown-app";
import { Suspense } from "react";

export default function EditDocumentPage() {
  return (
    <Suspense fallback={null}>
      <MarkdownApp />
    </Suspense>
  );
}
