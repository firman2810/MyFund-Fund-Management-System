import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { Check, ChevronDown } from 'lucide-react';
import { Logo } from './ui/Logo';

interface HeaderProps {
  currentUser: User;
  currentRole: UserRole;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
}

// Initials without honorifics or "bin/binti": "Dato’ Seri Hishamudin Ahmad" -> "HA".
function initials(name: string): string {
  const words = name.split(' ').filter((w) => /^[A-Z]/.test(w) && !/[.’']$/.test(w) && w !== 'Seri');
  return words.length ? `${words[0][0]}${words.length > 1 ? words[words.length - 1][0] : ''}` : name.slice(0, 1);
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentRole,
  currentTab,
  onTabChange,
  onRoleChange,
  onLogout,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Role-specific navigation items
  const navItems = {
    ministry: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'allocations', label: 'Fund Allocation' },
      { id: 'transactions', label: 'Transactions' },
    ],
    agency: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'distribution', label: 'Fund Distribution' },
      { id: 'transactions', label: 'Transactions' },
    ],
    auditor: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'reports', label: 'Reports' },
    ],
  }[currentRole];

  const demoRoles: { role: UserRole; name: string }[] = [
    { role: 'ministry', name: 'Ministry of Finance' },
    { role: 'agency', name: 'Agency / NGO (NADMA)' },
    { role: 'auditor', name: 'National Audit Dept' },
  ];

  // Focus ring is orange on the ink bar (DESIGN.md §8).
  const onBar = 'focus-visible:outline-remaining';

  return (
    <header className="bg-ink text-white print:hidden">
      <div className="max-w-[1320px] mx-auto px-6 min-h-16 flex flex-wrap items-center gap-x-8 gap-y-3">
        <Logo variant="dark" />

        <nav aria-label="Primary" className="flex flex-wrap gap-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center min-h-11 px-3.5 cursor-pointer ${onBar} ${
                  isActive
                    ? 'text-white font-medium shadow-[inset_0_-3px_0_var(--remaining)]'
                    : 'text-bar-muted hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile & quick role switch */}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            aria-expanded={roleDropdownOpen}
            className={`min-h-11 flex items-center gap-2.5 px-3 bg-transparent border border-bar-border text-white text-left cursor-pointer ${onBar}`}
          >
            <span aria-hidden="true" className="w-7 h-7 bg-white text-ink flex items-center justify-center font-mono text-[11px] font-medium">
              {initials(currentUser.name)}
            </span>
            <span className="hidden lg:flex flex-col leading-[1.2]">
              <span className="text-[13px] font-medium">{currentUser.name}</span>
              <span className="text-[11px] text-bar-sub">{currentUser.organization}</span>
            </span>
            <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 text-bar-muted" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-surface border-[1.5px] border-ink text-ink z-50">
              <div className="px-4 py-3 border-b border-border flex flex-col gap-0.5">
                <span className="font-semibold">{currentUser.name}</span>
                <span className="text-xs text-text-2">{currentUser.organization}</span>
              </div>

              {api.isMock && (
                <div className="py-2 border-b border-border">
                  <div className="font-mono text-[11px] text-muted px-4 py-1">SWITCH ACTIVE ROLE (FYP DEMO)</div>
                  {demoRoles.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => {
                        onRoleChange(r.role);
                        setRoleDropdownOpen(false);
                      }}
                      aria-current={currentRole === r.role ? 'true' : undefined}
                      className="w-full min-h-11 text-left px-4 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-page"
                    >
                      <span className={currentRole === r.role ? 'font-semibold' : 'font-medium'}>{r.name}</span>
                      {currentRole === r.role && <Check aria-hidden="true" size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setRoleDropdownOpen(false);
                  onLogout();
                }}
                className="w-full min-h-11 text-left px-4 font-medium cursor-pointer hover:bg-page"
              >
                Return to portal login →
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
