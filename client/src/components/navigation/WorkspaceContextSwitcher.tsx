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
    navigate('/app/org/profile');
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
          'flex items-center gap-1.5 sm:gap-2.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-border/70 bg-card/80 hover:bg-card text-foreground transition-all duration-150 shadow-2xs cursor-pointer select-none min-w-0 shrink h-8 sm:h-9 max-h-9 overflow-hidden',
          isOpen && 'ring-2 ring-primary/20 border-primary/50'
        )}
        title="Switch active workspace"
        aria-label="Workspace context switcher"
      >
        <div
          className="flex items-center justify-center w-6 h-6 min-w-6 min-h-6 max-w-6 max-h-6 rounded-lg bg-muted/60 border border-border/50 text-primary shrink-0 overflow-hidden p-0.5 aspect-square isolate"
          style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
        >
          {isPersonal ? (
            user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-full h-full max-w-full max-h-full object-cover rounded-md block shrink-0 aspect-square"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <User className="h-3.5 w-3.5" />
            )
          ) : activeContext.logoUrl ? (
            <img
              src={activeContext.logoUrl}
              alt={activeContext.name}
              className="w-full h-full max-w-full max-h-full object-contain block shrink-0"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Building2 className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="flex flex-col items-start text-left min-w-0 max-w-[80px] sm:max-w-[160px]">
          <span className="text-xs font-semibold truncate leading-tight w-full">
            {isPersonal ? user?.displayName || 'Personal' : activeContext.name}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate w-full hidden sm:block">
            {isPersonal ? 'Personal' : activeContext.role}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-0.5',
            isOpen && 'rotate-180 text-foreground'
          )}
        />
      </button>

      {/* Workspace Menu Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 bg-card p-2 text-foreground shadow-xl backdrop-blur-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150">
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
                    className="h-full w-full max-h-full max-w-full object-cover block shrink-0"
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
                            className="h-full w-full max-h-full max-w-full object-cover block shrink-0"
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
