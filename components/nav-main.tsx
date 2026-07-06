'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  PresentationIcon,
  FolderIcon,
  KeyIcon,
  UsersIcon,
  SettingsIcon,
  HelpCircleIcon,
  LayoutTemplateIcon,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const allNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboardIcon, roles: ['super_admin', 'editor', 'viewer'] },
  { title: 'Pitches', url: '/pitches', icon: PresentationIcon, roles: ['super_admin', 'editor', 'viewer'] },
  { title: 'Templates', url: '/templates', icon: LayoutTemplateIcon, roles: ['super_admin', 'editor'] },
  { title: 'Folders', url: '/folders', icon: FolderIcon, roles: ['super_admin', 'editor'] },
  { title: 'Access Tokens', url: '/access', icon: KeyIcon, roles: ['super_admin'] },
  { title: 'Users', url: '/users', icon: UsersIcon, roles: ['super_admin'] },
  { title: 'Settings', url: '/settings', icon: SettingsIcon, roles: ['super_admin'] },
  { title: 'Help', url: '/help', icon: HelpCircleIcon, roles: ['super_admin', 'editor'] },
];

export function NavMain({ role }: { role: string }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
            <Link
              href={item.url}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
            >
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
