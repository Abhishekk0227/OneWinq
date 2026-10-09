import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronDown,
  Plus,
  User,
  Shield,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useOrganizationContextStore } from '@/stores/organizationContextStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface WorkspaceContextSwitcherProps {
  className?: string;
  onOpenCreateModal?: () => void;
}

export function WorkspaceContextSwitcher({
  className,
  onOpenCreateModal,
}: WorkspaceContextSwitcherProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeContext,
    memberships,
    fetchMemberships,
    switchToPersonal,
    switchToOrganization,
  } = useOrganizationContextStore();

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  // Click outside listener
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPersonal = activeContext.type === 'PERSONAL';

  const handleSelectPersonal = () => {
    switchToPersonal();
    setIsOpen(false);
    navigate('/app');
  };

  const handleSelectOrg = (orgId: string) => {
    switchToOrganization(orgId);
    setIsOpen(false);
    navigate('/app/org/dashboard');
  };

  const handleCreateOrg = () => {
    setIsOpen(false);
    if (onOpenCreateModal) {
      onOpenCreateModal();
    } else {
      navigate('/app/organizations/create');
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card/80 hover:bg-card text-foreground transition-all duration-150 shadow-2xs cursor-pointer select-none',
          isOpen && 'ring-2 ring-primary/20 border-primary/50'
        )}
        title="Switch active workspace"
        aria-label="Workspace context switcher"
      >
        <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 text-primary shrink-0 overflow-hidden">
          {isPersonal ? (
            user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-3.5 w-3.5" />
            )
          ) : activeContext.logoUrl ? (
            <img
              src={activeContext.logoUrl}
              alt={activeContext.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Building2 className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="flex flex-col items-start text-left min-w-0 max-w-[140px] sm:max-w-[200px]">
          <span className="text-xs font-semibold truncate leading-none">
            {isPersonal ? user?.displayName || 'Personal' : activeContext.name}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate">
            {isPersonal ? 'Personal' : activeContext.role}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180 text-foreground'
          )}
        />
      </button>

      {/* Workspace Menu Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-border/80 bg-card p-2 text-foreground shadow-xl backdrop-blur-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Workspaces
          </div>

          {/* Personal Account Option */}
          <button
            type="button"
            onClick={handleSelectPersonal}
            className={cn(
              'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted/80 cursor-pointer',
              isPersonal && 'bg-primary/10 text-primary font-semibold'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground overflow-hidden shrink-0">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="truncate">{user?.displayName || 'Personal Profile'}</span>
                <span className="text-[10px] text-muted-foreground">Personal Account</span>
              </div>
            </div>
            {isPersonal && <Check className="h-4 w-4 text-primary shrink-0" />}
          </button>

          {/* Organizations Section */}
          <div className="my-1.5 border-t border-border/50" />
          <div className="px-2.5 py-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
            <span>Organizations</span>
            <span className="text-[10px] font-normal lowercase">({memberships.length})</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {memberships.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                No organization memberships yet
              </div>
            ) : (
              memberships.map((m) => {
                const org = m.organization;
                const isSelected =
                  !isPersonal && activeContext.organizationId === org.id;

                return (
                  <button
                    key={m.membershipId}
                    type="button"
                    onClick={() => handleSelectOrg(org.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted/80 cursor-pointer text-left',
                      isSelected && 'bg-primary/10 text-primary font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden shrink-0">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="truncate">{org.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="capitalize">{m.role.toLowerCase()}</span>
                          {org.isVerified && (
                            <span className="text-primary font-bold">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Footer: Register New Organization */}
          <div className="my-1.5 border-t border-border/50" />
          <button
            type="button"
            onClick={handleCreateOrg}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Organization</span>
          </button>
        </div>
      )}
    </div>
  );
}
