'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  PresentationIcon,
  FolderIcon,
  KeyIcon,
  SettingsIcon,
  HelpCircleIcon,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Pitches', url: '/pitches', icon: PresentationIcon },
  { title: 'Folders', url: '/folders', icon: FolderIcon },
  { title: 'Access Tokens', url: '/access', icon: KeyIcon },
  { title: 'Settings', url: '/settings', icon: SettingsIcon },
  { title: 'Hjælp', url: '/help', icon: HelpCircleIcon },
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
            <Link href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
