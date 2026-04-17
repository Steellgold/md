declare module "react-syntax-highlighter" {
  
  export type SyntaxHighlighterProps = PropsWithChildren<{
    language?: string;
    style?: Record<string, unknown>;
    customStyle?: CSSProperties;
    codeTagProps?: HTMLAttributes<HTMLElement>;
    PreTag?: keyof JSX.IntrinsicElements | ComponentType<unknown>;
  }>;

  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: Record<string, unknown>;
  export const oneLight: Record<string, unknown>;
}