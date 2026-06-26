/**
 * Prefix stamped on Lens-minted session ids so the edge middleware can enforce
 * capture-only (read-only) access without a DB round-trip (F036). A session whose
 * id starts with this prefix may READ any surface but is 403'd on every mutating
 * request. Kept dependency-free so it is safe to import from edge middleware.
 */
export const LENS_SESSION_PREFIX = 'lens_';
