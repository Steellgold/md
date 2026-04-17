"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DetachedWindowPortalProps = {
  open: boolean;
  title: string;
  onCloseAction: () => void;
  onBlocked?: (message: string) => void;
  children: ReactNode;
};

const popupWindowName = "md-preview-detached";
const popupWindowFeatures = [
  "popup=yes",
  "width=960",
  "height=900",
  "left=120",
  "top=120",
  "resizable=yes",
  "scrollbars=yes",
].join(",");
const managedHeadAttribute = "data-md-detached-head";

const syncDocumentHead = (sourceDocument: Document, targetDocument: Document) => {
  const managedNodes = targetDocument.head.querySelectorAll(
    `[${managedHeadAttribute}="true"]`
  );

  managedNodes.forEach((node) => {
    node.remove();
  });

  const styleNodes = sourceDocument.head.querySelectorAll(
    'style, link[rel="stylesheet"]'
  );

  styleNodes.forEach((node) => {
    const clonedNode = node.cloneNode(true);

    if (clonedNode instanceof HTMLElement) {
      clonedNode.setAttribute(managedHeadAttribute, "true");
    }

    targetDocument.head.appendChild(clonedNode);
  });
};

const syncDocumentRoot = (sourceDocument: Document, targetDocument: Document) => {
  targetDocument.documentElement.lang = sourceDocument.documentElement.lang;
  targetDocument.documentElement.className =
    sourceDocument.documentElement.className;
  targetDocument.documentElement.style.cssText =
    sourceDocument.documentElement.style.cssText;
  targetDocument.body.className = sourceDocument.body.className;
  targetDocument.body.style.cssText = sourceDocument.body.style.cssText;
};

export const DetachedWindowPortal = ({
  open,
  title,
  onCloseAction,
  onBlocked,
  children,
}: DetachedWindowPortalProps) => {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setTimeout(() => setPortalContainer(null), 0);
      return;
    }

    const detachedWindow = window.open(
      "",
      popupWindowName,
      popupWindowFeatures
    );

    if (!detachedWindow) {
      onBlocked?.(
        "Unable to open the preview window. Allow pop-ups for this site and try again."
      );
      onCloseAction();
      return;
    }

    const sourceDocument = window.document;
    const targetDocument = detachedWindow.document;
    const container = targetDocument.createElement("div");

    container.className = "h-screen";
    targetDocument.body.replaceChildren(container);
    targetDocument.title = title;
    syncDocumentHead(sourceDocument, targetDocument);
    syncDocumentRoot(sourceDocument, targetDocument);
    detachedWindow.focus();

    setTimeout(() => setPortalContainer(container), 0);

    const syncTitle = () => {
      targetDocument.title = title;
    };

    const syncHead = () => {
      syncDocumentHead(sourceDocument, targetDocument);
    };

    const syncRoot = () => {
      syncDocumentRoot(sourceDocument, targetDocument);
    };

    const handleBeforeUnload = () => {
      onCloseAction();
    };

    const headObserver = new MutationObserver(syncHead);
    const htmlObserver = new MutationObserver(syncRoot);
    const bodyObserver = new MutationObserver(syncRoot);

    detachedWindow.addEventListener("beforeunload", handleBeforeUnload);
    headObserver.observe(sourceDocument.head, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    htmlObserver.observe(sourceDocument.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    bodyObserver.observe(sourceDocument.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    syncTitle();

    return () => {
      setPortalContainer(null);
      headObserver.disconnect();
      htmlObserver.disconnect();
      bodyObserver.disconnect();
      detachedWindow.removeEventListener("beforeunload", handleBeforeUnload);

      if (!detachedWindow.closed) {
        detachedWindow.close();
      }
    };
  }, [onBlocked, onCloseAction, open, title]);

  if (!portalContainer) {
    return null;
  }

  return createPortal(children, portalContainer);
};
