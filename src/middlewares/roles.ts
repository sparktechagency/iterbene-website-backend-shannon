export type Role = 'super_admin' | 'admin' | 'user';

const allRoles: Record<Role, string[]> = {
  super_admin: ['super_admin', 'admin', 'common'],
  admin: ['admin', 'common'],
  user: ['user', 'common'],
};

const Roles = Object.keys(allRoles) as Array<keyof typeof allRoles>;

// Map the roles to their corresponding rights
const roleRights = new Map<Role, string[]>(
  Object.entries(allRoles) as [Role, string[]][]
);

export { Roles, roleRights };
