import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Resolve __dirname for the current module.
 *
 * Isolated into its own module so tests can mock it: `import.meta.url` is only
 * valid in ESM, but the Jest test runtime compiles modules to CommonJS, where
 * `import.meta` is a syntax error. Keeping the lookup here lets tests stub this
 * module out without touching the code that consumes it.
 */
export const __dirname = dirname(fileURLToPath(import.meta.url));
