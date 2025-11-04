import { User, Building2, Calendar, LogOut, Users as UsersIcon, Calculator, CalendarDays, Dumbbell } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import panteraLogo from "@/assets/pantera.png";
import pantheraLogo from "@/assets/panthera-logo.jpeg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { NotificationBell } from "./NotificationBell";

const menuItems = [
  { title: "Clases", url: "/classes", icon: Calendar },
  { title: "Mi Perfil", url: "/profile", icon: User },
  { title: "Datos del Centro", url: "/gym-info", icon: Building2 },
  { title: "Calculadoras", url: "/calculator", icon: Calculator },
];

const adminMenuItems = [
  { title: "Usuarios", url: "/users", icon: UsersIcon },
  { title: "Gestionar Clases", url: "/manage-classes", icon: Dumbbell },
  { title: "Gestionar Horarios", url: "/manage-schedules", icon: CalendarDays },
];

export function AppSidebar() {
  const { open, setOpenMobile, isMobile } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear ALL localStorage and sessionStorage FIRST
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out from Supabase with global scope
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force complete page reload from server (not cache)
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, clear everything and reload
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/auth";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2 px-2">
          {open ? (
            <img src={pantheraLogo} alt="Panthera Fitness" className="h-12 w-auto object-contain" />
          ) : (
            <img src={panteraLogo} alt="Panthera" className="w-8 h-8" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base md:text-lg font-bold text-primary">
            {open && <span>MENÚ</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto sticky bottom-0 bg-sidebar border-t pt-2 pb-2">
        <Button
          variant="destructive"
          className="w-full justify-start bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {open && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
