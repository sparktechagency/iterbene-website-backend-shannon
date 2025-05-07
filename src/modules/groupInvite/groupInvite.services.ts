import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { IGroupInvite } from './groupInvite.interface';
import GroupInvite from './groupInvite.model';

const getMyInvitedGroups = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IGroupInvite>> => {
  return await GroupInvite.paginate(filters, options);
};

export const GroupInviteService = {
  getMyInvitedGroups,
};