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
            const found = memberships.find((m: any) => m.organization?.id === current.organizationId);
            if (!found) {
              set({ activeContext: { type: 'PERSONAL' } });
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
      },

      switchToOrganization: (organizationId: string) => {
        const found = get().memberships.find(
          (m) => m.organization?.id === organizationId
        );
        if (found) {
          set({
            activeContext: {
              type: 'ORGANIZATION',
              organizationId: found.organization.id,
              name: found.organization.name,
              slug: found.organization.slug,
              logoUrl: found.organization.logoUrl,
              role: found.role,
              permissions: found.permissions || [],
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
      },
    }),
    {
      name: 'onewinq-org-context',
      partialize: (state) => ({ activeContext: state.activeContext }),
    }
  )
);
