import { NotionEditor } from "@/components/editor/notion-editor"

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <header className="mb-6 flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Éditeur WYSIWYG
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
            Un éditeur type Notion dans votre navigateur
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Tapez <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">/</kbd>{" "}
            pour ouvrir le menu de blocs, sélectionnez du texte pour voir la barre flottante, et utilisez
            la barre d&apos;outils en haut pour toutes les mises en forme.
          </p>
        </header>
        <NotionEditor />
      </div>
    </main>
  )
}
