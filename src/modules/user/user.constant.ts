export type Role = 'superAdmin' | 'Admin' | 'User';

export type TUserStatus = 'Active' | 'Delete' | 'Block' | 'Banned';

export const UserStatus: TUserStatus[] = [
  'Active',
  'Delete',
  'Block',
  'Banned',
];

export type TGender = 'Male' | 'Female';

export const Gender: TGender[] = ['Male', 'Female'];

export type IMaritalStatus = 'Single' | 'Divorced' | 'Widowed' | 'Separated';

export const MaritalStatus: IMaritalStatus[] = [
  'Single',
  'Divorced',
  'Separated',
  'Widowed',
];
