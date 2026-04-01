import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import JobsPage from "./pages/JobsPage";
import MaterialsPage from "./pages/MaterialsPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import MarketplacePage from "./pages/MarketplacePage";
import TraderProfilePage from "./pages/TraderProfilePage";
import TraderDashboard from "./pages/TraderDashboard";
import TradeAccountsPage from "./pages/TradeAccountsPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile-setup" element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            } />

            {/* Main layout */}
            <Route element={<AppLayout />}>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/trader/:id" element={<TraderProfilePage />} />

              {/* Jobs — viewable by all, posting gated */}
              <Route path="/jobs" element={<JobsPage />} />

              {/* Trade-only pages */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={["trade", "admin"]}>
                  <TraderDashboard />
                </ProtectedRoute>
              } />
              <Route path="/trade-accounts" element={
                <ProtectedRoute allowedRoles={["trade", "admin"]}>
                  <TradeAccountsPage />
                </ProtectedRoute>
              } />
              <Route path="/materials" element={
                <ProtectedRoute allowedRoles={["trade", "admin"]}>
                  <MaterialsPage />
                </ProtectedRoute>
              } />

              {/* Deliveries — trades + drivers */}
              <Route path="/deliveries" element={
                <ProtectedRoute allowedRoles={["trade", "driver", "admin"]}>
                  <DeliveriesPage />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
