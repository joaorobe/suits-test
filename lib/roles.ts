export type Role = 'admin' | 'costureira' | 'cliente';
export function homeFor(role: Role) { return role === 'cliente' ? '/cliente' : role === 'costureira' ? '/costureira' : '/dashboard'; }
