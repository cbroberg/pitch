import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { getUser } from '@/lib/get-user';
import Link from 'next/link';
import Image from 'next/image';
import crypto from 'crypto';

export async function AppSidebar() {
  const user = await getUser();
  const hash = crypto.createHash('md5').update(user.email.toLowerCase().trim()).digest('hex');
  const avatarUrl = `https://www.gravatar.com/avatar/${hash}?s=64&d=mp`;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard">
          <Image src="/pitch-vault-logo-dark.svg" alt="Pitch Vault" width={320} height={128} className="h-16 w-auto" unoptimized />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email }} avatarUrl={avatarUrl} />
      </SidebarFooter>
    </Sidebar>
  );
}
