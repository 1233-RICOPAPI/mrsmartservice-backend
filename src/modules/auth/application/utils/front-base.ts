function trimRightSlash(u: string) {
  return (u || '').trim().replace(/\/+$/, '');
}

export function resolveFrontBase() {
  const env = trimRightSlash(String(process.env.FRONT_URL || ''));
  if (env) return env;

  return process.env.NODE_ENV === 'production'
    ? 'https://mrsmartservice-decad.web.app'
    : 'http://localhost:3000';
}
