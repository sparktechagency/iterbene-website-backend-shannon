export const roleRights = new Map<string, string[]>([
  ['User', ['Common', 'User']],
  ['Admin', ['Common', 'Admin']],
  ['Super_Admin', ['Common', 'Admin', 'Super_Admin']],
]);

export const Roles = ['User', 'Admin', 'Super_Admin'];