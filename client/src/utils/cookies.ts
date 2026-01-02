// Cookie utilities with host-only cookies for Railway/cloud compatibility
// Host-only cookies (no domain specified) work better on platform domains like *.up.railway.app

export const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export const setCookie = (name: string, value: string, days: number) => {
  // Use host-only cookies (no domain) for maximum compatibility
  // This works on all platforms including Railway, Vercel, etc.
  document.cookie = `${name}=${value}; path=/; max-age=${days * 24 * 60 * 60}; SameSite=Lax`;
};

export const deleteCookie = (name: string) => {
  // Delete from current host (no domain)
  document.cookie = `${name}=; path=/; max-age=0`;
};
