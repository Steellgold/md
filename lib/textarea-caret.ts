"use client";

type CaretCoordinates = {
  top: number;
  left: number;
  height: number;
};

const getComputedStyleValue = (style: CSSStyleDeclaration, property: string) =>
  style.getPropertyValue(property);

const copyTextareaStyles = (
  source: HTMLTextAreaElement,
  target: HTMLDivElement
) => {
  const style = window.getComputedStyle(source);
  const properties = [
    "direction",
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "MozTabSize",
  ];

  properties.forEach((property) => {
    // @ts-expect-error - TS doesn't know about vendor props on CSSStyleDeclaration
    target.style[property] = getComputedStyleValue(style, property);
  });
};

export const getTextareaCaretCoordinates = (
  textarea: HTMLTextAreaElement,
  position: number
): CaretCoordinates => {
  const mirror = document.createElement("div");
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";

  copyTextareaStyles(textarea, mirror);

  const textBeforeCaret = textarea.value.substring(0, position);
  const textAfterCaret = textarea.value.substring(position);

  mirror.textContent = textBeforeCaret;

  const marker = document.createElement("span");
  marker.textContent = textAfterCaret.length === 0 ? "." : textAfterCaret[0];

  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();

  document.body.removeChild(mirror);

  const top = markerRect.top - mirrorRect.top - textarea.scrollTop;
  const left = markerRect.left - mirrorRect.left - textarea.scrollLeft;

  return {
    top,
    left,
    height:
      markerRect.height ||
      parseFloat(window.getComputedStyle(textarea).lineHeight),
  };
};
