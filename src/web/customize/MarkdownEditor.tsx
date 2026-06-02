/**
 * Lazy, theme-aware CodeMirror 6 markdown editor wrapper (Plan 100, Task 5).
 *
 * CodeMirror (`@uiw/react-codemirror`) and its markdown language/dark-theme
 * extensions are heavy and are needed ONLY on the Customize detail route. To
 * keep them off the listing bundle, the whole `react-codemirror` module — plus
 * `@codemirror/lang-markdown` and the bundled `oneDark` theme — are reached
 * EXCLUSIVELY through a single dynamic `import()` inside a `React.lazy` factory.
 * Nothing here is imported at the top level, so importing this file (and the
 * route that renders it) never pulls CodeMirror into the eager graph; the
 * bundler splits it into a chunk fetched only when the editor first mounts.
 *
 * This is an EDITOR boundary, distinct from the shared `renderMarkdown` /
 * DOMPurify path: it shows raw, editable markdown source with syntax
 * highlighting, never sanitized HTML output. It must not route content through
 * `renderMarkdown`.
 *
 * Theming mirrors the mermaid renderers: the consumer passes the resolved
 * `'light' | 'dark'` scheme and the dark theme extension is applied when
 * `theme === 'dark'`. Switching the prop re-applies the theme on the next
 * render (CodeMirror reconciles its extensions), with no library reload.
 */

import { Suspense, lazy, type ReactNode } from 'react';

/** The resolved color scheme the editor is themed for (mirrors mermaid). */
export type EditorTheme = 'light' | 'dark';

interface LazyEditorProps {
  value: string;
  onChange: (next: string) => void;
  theme: EditorTheme;
}

/**
 * The code-split editor. The dynamic `import()` pulls `react-codemirror`, the
 * markdown language, and the `oneDark` theme together; they resolve in one
 * chunk, and the composed component is what `React.lazy` renders. The markdown
 * extension drives syntax highlighting; `basicSetup` provides line numbers and
 * editing affordances but NO WYSIWYG toolbar.
 */
const LazyEditor = lazy(async () => {
  const [{ default: CodeMirror }, { markdown }, { oneDark }] = await Promise.all([
    import('@uiw/react-codemirror'),
    import('@codemirror/lang-markdown'),
    import('@codemirror/theme-one-dark'),
  ]);

  function Editor({ value, onChange, theme }: LazyEditorProps) {
    return (
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[markdown()]}
        theme={theme === 'dark' ? oneDark : 'light'}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: false,
        }}
        height="100%"
      />
    );
  }

  return { default: Editor };
});

export interface MarkdownEditorProps extends LazyEditorProps {
  /** Surface shown while the editor chunk is being fetched. */
  fallback: ReactNode;
}

/**
 * Public wrapper: renders the lazily-loaded editor inside a `Suspense` boundary
 * so the route shows a designed fallback while the CodeMirror chunk downloads.
 */
export function MarkdownEditor({ fallback, ...props }: MarkdownEditorProps) {
  return (
    <Suspense fallback={fallback}>
      <LazyEditor {...props} />
    </Suspense>
  );
}
