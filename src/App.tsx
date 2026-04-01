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
import JobDetailPage from "./pages/JobDetailPage";
import SubmitQuotePage from "./pages/SubmitQuotePage";
import MaterialsPage from "./pages/MaterialsPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import MarketplacePage from "./pages/MarketplacePage";
import TraderProfilePage from "./pages/TraderProfilePage";
import TraderDashboard from "./pages/TraderDashboard";
import TradeAccountsPage from "./pages/TradeAccountsPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import MessagesPage from "./pages/MessagesPage";
import BasicCamPage from "./pages/BasicCamPage";
import ComplianceCertsPage from "./pages/ComplianceCertsPage";
import PostJobPage from "./pages/PostJobPage";
import DriverDashboard from "./pages/DriverDashboard";
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

              {/* Jobs */}
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/post-job" element={
                <ProtectedRoute>
                  <PostJobPage />
                </ProtectedRoute>
              } />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/jobs/:jobId/quote" element={
                <ProtectedRoute allowedRoles={["trade", "admin"]}>
                  <SubmitQuotePage />
                </ProtectedRoute>
              } />

              {/* Subscription */}
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <SubscriptionPage />
                </ProtectedRoute>
              } />

              {/* Messages — any authenticated user */}
              <Route path="/messages" element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              } />

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
              <Route path="/basic-cam" element={
                <ProtectedRoute allowedRoles={["trade", "admin"]}>
                  <BasicCamPage />
                </ProtectedRoute>
              } />
              <Route path="/compliance" element={
                <ProtectedRoute allowedRoles={["trade", "admin"]}>
                  <ComplianceCertsPage />
                </ProtectedRoute>
              } />

              {/* Deliveries — trades + drivers */}
              <Route path="/deliveries" element={
                <ProtectedRoute allowedRoles={["trade", "driver", "admin"]}>
                  <DeliveriesPage />
                </ProtectedRoute>
              } />

              {/* Driver dashboard */}
              <Route path="/driver" element={
                <ProtectedRoute allowedRoles={["driver", "admin"]}>
                  <DriverDashboard />
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
