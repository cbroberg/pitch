import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getUser } from '@/lib/get-user';
import Link from 'next/link';
import Image from 'next/image';

export async function AppSidebar() {
  const user = await getUser();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard">
                <Image src="/pitch-vault-logo-dark.svg" alt="Pitch Vault" width={220} height={126} className="h-10 w-auto" unoptimized />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email }} />
      </SidebarFooter>
    </Sidebar>
  );
}
