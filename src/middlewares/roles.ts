export const roleRights = new Map<string, string[]>([
  ['user', ['common']],
  ['admin', ['common', 'admin']],
  ['super_admin', ['common', 'admin', 'super_admin']],
]);

export const Roles = ['user', 'admin', 'super_admin'];