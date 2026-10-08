export const RESUME_LABELS = ['relationship resume', 'the relationship resume'];

export const isResumeLabel = (label) => RESUME_LABELS.includes(String(label || '').trim().toLowerCase());

// Resume links are written only by a verified invite claim. Any other write keeps the
// stored resume link and drops resume links supplied by the caller.
export const withProtectedResumeLink = (incomingLinks, currentLinks = []) => [
  ...(Array.isArray(incomingLinks) ? incomingLinks : []).filter((link) => !isResumeLabel(link?.label)),
  ...currentLinks.filter((link) => isResumeLabel(link?.label)),
];
