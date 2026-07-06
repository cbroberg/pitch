import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { GlobalCommandPalette } from '@/components/global-command-palette';
import { PwaUpdateBar } from '@/components/pwa-update-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PwaUpdateBar />
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
      <GlobalCommandPalette />
    </SidebarProvider>
  );
}
