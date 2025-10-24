import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
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

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 h-14 border-b border-border flex items-center px-4 bg-card/95 backdrop-blur-sm">
          <SidebarTrigger className="md:hidden" />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);

const App = () => (
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
