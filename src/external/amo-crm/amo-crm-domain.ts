const AMOCRM_ACCOUNT_DOMAIN_SUFFIX = '.amocrm.ru';

/**
 * Accepts only a plain amoCRM account hostname, without a scheme, credentials,
 * port, path, query or fragment. Returns a normalized hostname or null.
 */
export const parseAmoCrmAccountDomain = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const url = new URL(`https://${normalized}`);

    if (
      url.hostname !== normalized ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !url.hostname.endsWith(AMOCRM_ACCOUNT_DOMAIN_SUFFIX)
    ) {
      return null;
    }

    return url.hostname;
  } catch {
    return null;
  }
};
