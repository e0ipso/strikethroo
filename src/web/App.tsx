import { cn } from './vendor/utils/cn';

/**
 * Throwaway verification smoke app. Renders a single screen with a Fraunces
 * display heading and a Dalia button (the `btn btn--{kind}` class convention
 * from the design kit) to prove the vendored design system's fonts and tokens
 * render. Superseded by the real app shell in a later plan; do not elaborate
 * into routing or real screens.
 */
export function App() {
  const kind = 'primary';
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          color: 'var(--color-dalia-dark)',
          margin: 0,
        }}
      >
        Strikethroo
      </h1>
      <button className={cn('btn', `btn--${kind}`)}>Get started</button>
    </main>
  );
}
