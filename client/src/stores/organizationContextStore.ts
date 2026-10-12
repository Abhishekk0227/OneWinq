import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserOrganizationMembership } from '@/types/organization.types';
import { organizationsApi } from '@/features/organizations/api/organizations.api';

export type ActiveContext =
  | { type: 'PERSONAL' }
  | {
      type: 'ORGANIZATION';
      organizationId: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
      role: string;
      permissions: string[];
    };

interface OrganizationContextState {
  activeContext: ActiveContext;
  memberships: UserOrganizationMembership[];
  isLoading: boolean;
  fetchMemberships: () => Promise<void>;
  switchToPersonal: () => void;
  switchToOrganization: (organizationId: string) => void;
  clearContext: () => void;
}

export const useOrganizationContextStore = create<OrganizationContextState>()(
  persist(
    (set, get) => ({
      activeContext: { type: 'PERSONAL' },
      memberships: [],
      isLoading: false,

      fetchMemberships: async () => {
        try {
          set({ isLoading: true });
          const res = await organizationsApi.getMyOrganizations();
          const memberships = (res as any)?.data?.organizations || [];
          set({ memberships });

          // If current context is an org that the user is no longer member of, fallback to personal
          const current = get().activeContext;
          if (current.type === 'ORGANIZATION') {
            const found = memberships.find(
              (m: any) => (m.organization?.id || m.organization?._id) === current.organizationId
            );
            if (!found) {
              set({ activeContext: { type: 'PERSONAL' } });
            } else {
              const role = (found.role || 'MEMBER').toUpperCase();
              const basePermissions =
                role === 'OWNER'
                  ? [
                      'org:edit', 'org:delete', 'members:view', 'members:invite', 'members:edit',
                      'members:remove', 'departments:manage', 'jobs:view', 'jobs:create', 'jobs:edit',
                      'jobs:delete', 'applications:view', 'applications:manage', 'cards:manage',
                      'events:view', 'events:manage', 'approvals:view', 'approvals:manage', 'roles:view',
                      'roles:manage', 'settings:manage', 'showcase:manage', 'analytics:view', 'audit:view',
                      'posts:manage',
                    ]
                  : role === 'ADMIN'
                  ? [
                      'org:edit', 'members:view', 'members:invite', 'members:edit', 'members:remove',
                      'departments:manage', 'jobs:view', 'jobs:create', 'jobs:edit', 'jobs:delete',
                      'applications:view', 'applications:manage', 'cards:manage', 'events:view',
                      'events:manage', 'approvals:view', 'approvals:manage', 'roles:view', 'roles:manage',
                      'settings:manage', 'showcase:manage', 'analytics:view', 'audit:view', 'posts:manage',
                    ]
                  : role === 'HR_MANAGER'
                  ? [
                      'members:view', 'members:invite', 'jobs:view', 'jobs:create', 'jobs:edit',
                      'jobs:delete', 'applications:view', 'applications:manage', 'events:view',
                    ]
                  : role === 'MANAGER'
                  ? [
                      'members:view', 'approvals:view', 'approvals:manage', 'jobs:view', 'jobs:create',
                      'events:view',
                    ]
                  : ['members:view', 'events:view', 'jobs:view', 'jobs:create'];

              const permissions = Array.from(
                new Set([...basePermissions, ...(found.permissions || [])])
              );

              set({
                activeContext: {
                  ...current,
                  role: found.role,
                  permissions,
                },
              });
            }
          }
        } catch {
          // If unauthenticated or failure, graceful fallback
        } finally {
          set({ isLoading: false });
        }
      },

      switchToPersonal: () => {
        set({ activeContext: { type: 'PERSONAL' } });
        try {
          localStorage.removeItem('onewinq-org-context');
        } catch {
          // ignore
        }
      },

      switchToOrganization: (organizationId: string) => {
        const found = get().memberships.find(
          (m) =>
            m.organization?.id === organizationId ||
            (m.organization as any)?._id === organizationId
        );
        if (found) {
          const org = found.organization as any;
          const role = (found.role || 'MEMBER').toUpperCase();
          const basePermissions =
            role === 'OWNER'
              ? [
                  'org:edit', 'org:delete', 'members:view', 'members:invite', 'members:edit',
                  'members:remove', 'departments:manage', 'jobs:view', 'jobs:create', 'jobs:edit',
                  'jobs:delete', 'applications:view', 'applications:manage', 'cards:manage',
                  'events:view', 'events:manage', 'approvals:view', 'approvals:manage', 'roles:view',
                  'roles:manage', 'settings:manage', 'showcase:manage', 'analytics:view', 'audit:view',
                  'posts:manage',
                ]
              : role === 'ADMIN'
              ? [
                  'org:edit', 'members:view', 'members:invite', 'members:edit', 'members:remove',
                  'departments:manage', 'jobs:view', 'jobs:create', 'jobs:edit', 'jobs:delete',
                  'applications:view', 'applications:manage', 'cards:manage', 'events:view',
                  'events:manage', 'approvals:view', 'approvals:manage', 'roles:view', 'roles:manage',
                  'settings:manage', 'showcase:manage', 'analytics:view', 'audit:view', 'posts:manage',
                ]
              : role === 'HR_MANAGER'
              ? [
                  'members:view', 'members:invite', 'jobs:view', 'jobs:create', 'jobs:edit',
                  'jobs:delete', 'applications:view', 'applications:manage', 'events:view',
                ]
              : role === 'MANAGER'
              ? [
                  'members:view', 'approvals:view', 'approvals:manage', 'jobs:view', 'jobs:create',
                  'events:view',
                ]
              : ['members:view', 'events:view', 'jobs:view', 'jobs:create'];

          const permissions = Array.from(
            new Set([...basePermissions, ...(found.permissions || [])])
          );

          set({
            activeContext: {
              type: 'ORGANIZATION',
              organizationId: org.id || org._id,
              name: org.name,
              slug: org.slug,
              logoUrl: org.logoUrl,
              role: found.role,
              permissions,
            },
          });
        }
      },

      clearContext: () => {
        set({
          activeContext: { type: 'PERSONAL' },
          memberships: [],
          isLoading: false,
        });
        try {
          localStorage.removeItem('onewinq-org-context');
        } catch {
          // ignore
        }
      },
    }),
    {
      name: 'onewinq-org-context',
      partialize: (state) => ({ activeContext: state.activeContext }),
    }
  )
);
