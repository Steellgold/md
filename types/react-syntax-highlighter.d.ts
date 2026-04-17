declare module "react-syntax-highlighter" {
  import type * as React from "react";

  export type SyntaxHighlighterProps = React.PropsWithChildren<{
    language?: string;
    style?: Record<string, unknown>;
    customStyle?: React.CSSProperties;
    codeTagProps?: React.HTMLAttributes<HTMLElement>;
    PreTag?: keyof React.JSX.IntrinsicElements | React.ComponentType<unknown>;
  }>;

  export const Prism: React.ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: Record<string, unknown>;
  export const oneLight: Record<string, unknown>;
}
