import { describe, it, expect, vi } from 'vitest';
import {
  requireOrgPermission,
  requireOrgAdmin,
  requireOrgOwner,
} from '../../../src/middleware/requireOrgPermission.js';
import { ORGANIZATION_ROLE, ORGANIZATION_PERMISSION } from '../../../src/config/constants.js';

describe('requireOrgPermission Middleware Unit Tests', () => {
  it('allows access if member is OWNER regardless of explicit permission', () => {
    const middleware = requireOrgPermission(ORGANIZATION_PERMISSION.JOBS_CREATE);
    const req = {
      membership: { role: ORGANIZATION_ROLE.OWNER },
      orgPermissions: [],
    };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows access if member has the requested permission', () => {
    const middleware = requireOrgPermission(ORGANIZATION_PERMISSION.JOBS_CREATE);
    const req = {
      membership: { role: ORGANIZATION_ROLE.HR_MANAGER },
      orgPermissions: [ORGANIZATION_PERMISSION.JOBS_CREATE, ORGANIZATION_PERMISSION.JOBS_VIEW],
    };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects access with ForbiddenError if permission is missing', () => {
    const middleware = requireOrgPermission(ORGANIZATION_PERMISSION.ORG_DELETE);
    const req = {
      membership: { role: ORGANIZATION_ROLE.MEMBER },
      orgPermissions: [ORGANIZATION_PERMISSION.MEMBERS_VIEW],
    };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  it('requireOrgAdmin allows OWNER and ADMIN, rejects MEMBER', () => {
    const reqOwner = { membership: { role: ORGANIZATION_ROLE.OWNER } };
    const nextOwner = vi.fn();
    requireOrgAdmin(reqOwner, {}, nextOwner);
    expect(nextOwner).toHaveBeenCalledWith();

    const reqAdmin = { membership: { role: ORGANIZATION_ROLE.ADMIN } };
    const nextAdmin = vi.fn();
    requireOrgAdmin(reqAdmin, {}, nextAdmin);
    expect(nextAdmin).toHaveBeenCalledWith();

    const reqMember = { membership: { role: ORGANIZATION_ROLE.MEMBER } };
    const nextMember = vi.fn();
    requireOrgAdmin(reqMember, {}, nextMember);
    const err = nextMember.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });
});
