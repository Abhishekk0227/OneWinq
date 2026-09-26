import { describe, it, expect, vi } from 'vitest';
import { requireRole, requireAdmin } from '../../../src/middleware/authorize.js';
import { ADMIN_ROLE, ERROR_CODE } from '../../../src/config/constants.js';

describe('Authorize Middleware Unit Tests', () => {
  it('throws AUTHENTICATION_REQUIRED if req.user is missing', async () => {
    const middleware = requireRole(ADMIN_ROLE.ADMIN);
    const req = {};
    const res = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe(ERROR_CODE.AUTHENTICATION_REQUIRED);
  });

  it('throws FORBIDDEN if user role is not in allowedRoles', async () => {
    const middleware = requireAdmin;
    const req = { user: { id: '64b0f0000000000000000001', role: 'USER' } };
    const res = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe(ERROR_CODE.FORBIDDEN);
  });

  it('calls next without error if user role matches allowed roles', async () => {
    const middleware = requireAdmin;
    const req = { user: { id: '64b0f0000000000000000001', role: ADMIN_ROLE.ADMIN } };
    const res = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
