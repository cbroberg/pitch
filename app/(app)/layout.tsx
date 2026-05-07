import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Floating toggle — only visible when sidebar is collapsed */}
        <div className="fixed top-3 left-3 z-50 group-data-[sidebar-state=expanded]/sidebar-wrapper:hidden">
          <SidebarTrigger className="bg-background border shadow-sm rounded-md" />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
