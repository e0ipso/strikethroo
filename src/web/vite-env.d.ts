/// <reference types="vite/client" />

/** Package version injected at build time via Vite `define` (see vite.config.mts). */
declare const __APP_VERSION__: string;

/**
 * YAML modules imported at build time via @modyfi/vite-plugin-yaml. The plugin
 * parses the file and exposes the resulting object as the default export.
 */
declare module '*.yaml' {
  const data: Record<string, unknown>;
  export default data;
}
