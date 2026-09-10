/**
 * Central place for every external/deployment-specific link on the landing page.
 * Update these once real values exist instead of hunting through components.
 */

// Real, stable — the project's GitHub repository.
export const REPO_URL = 'https://github.com/zanvencelj/hecto-hr';

// Web apps. Defaults match the documented local dev ports (see README);
// override via env vars once these are deployed somewhere with a real domain.
export const MANAGER_APP_URL = import.meta.env['VITE_MANAGER_URL'] ?? 'http://localhost:4200';
export const ADMIN_APP_URL = import.meta.env['VITE_ADMIN_URL'] ?? 'http://localhost:4300';

// Android/iOS download links are NOT baked in here — they're managed from the
// admin app (Settings → App Links) and fetched at runtime from GET /api/app-links,
// so publishing a new EAS build never requires rebuilding/redeploying this site.
// See apps/landing/src/hooks/use-app-links.ts.

// SUS questionnaire (Google Forms). Embedded directly in the Survey section;
// SUS_FORM_URL is the plain viewform link used for the "open in new tab" fallback.
const SUS_FORM_ID = '1FAIpQLSdTTpwTepyMGQrINGIOzKWDzfS6NTFT5v_QnJ1iY7fqSFAGgA';
export const SUS_FORM_URL: string | null =
  `https://docs.google.com/forms/d/e/${SUS_FORM_ID}/viewform`;
export const SUS_FORM_EMBED_URL =
  `https://docs.google.com/forms/d/e/${SUS_FORM_ID}/viewform?embedded=true`;
