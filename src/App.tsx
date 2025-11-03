import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { NotificationBell } from "./components/NotificationBell";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { NotificationPermissionRequest } from "./components/NotificationPermissionRequest";
import Profile from "./pages/Profile";
import GymInfo from "./pages/GymInfo";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Calculator from "./pages/Calculator";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ManageSchedules from "./pages/ManageSchedules";
import ManageClasses from "./pages/ManageClasses";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [showNotificationRequest, setShowNotificationRequest] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setShowNotificationRequest(true);
      }
    };
    checkAuth();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 h-14 border-b border-border flex items-center justify-between px-4 bg-card/95 backdrop-blur-sm">
            <SidebarTrigger className="md:hidden" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4">
              {showNotificationRequest && <NotificationPermissionRequest />}
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // Check if user needs to change password
        const { data: profile } = await supabase
          .from("profiles")
          .select("password_changed")
          .eq("id", user.id)
          .single();
        
        if (profile && !profile.password_changed) {
          setNeedsPasswordChange(true);
        } else {
          setNeedsPasswordChange(false);
        }
      }
    };

    checkUserStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          checkUserStatus();
        } else {
          setUserId(null);
          setNeedsPasswordChange(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Classes />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            <Route
              path="/gym-info"
              element={
                <AppLayout>
                  <GymInfo />
                </AppLayout>
              }
            />
            <Route
              path="/classes"
              element={
                <AppLayout>
                  <Classes />
                </AppLayout>
              }
            />
            <Route
              path="/classes/:id"
              element={
                <AppLayout>
                  <ClassDetail />
                </AppLayout>
              }
            />
            <Route
              path="/users"
              element={
                <AppLayout>
                  <Users />
                </AppLayout>
              }
            />
            <Route
              path="/users/:id"
              element={
                <AppLayout>
                  <UserDetail />
                </AppLayout>
              }
            />
            <Route
              path="/calculator"
              element={
                <AppLayout>
                  <Calculator />
                </AppLayout>
              }
            />
            <Route
              path="/manage-schedules"
              element={
                <AppLayout>
                  <ManageSchedules />
                </AppLayout>
              }
            />
            <Route
              path="/manage-classes"
              element={
                <AppLayout>
                  <ManageClasses />
                </AppLayout>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        {userId && (
          <ChangePasswordDialog 
            open={needsPasswordChange} 
            onClose={() => setNeedsPasswordChange(false)}
            userId={userId} 
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
