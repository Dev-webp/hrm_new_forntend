/** Same as HTML: JSON.parse(atob(token.split('.')[1])) */
export function parseJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
