import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import TraderLayout from "./components/TraderLayout";
import DriverLayout from "./components/DriverLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import KycGate from "./components/KycGate";
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
import SiteEvidencePage from "./pages/SiteEvidencePage";
import ComplianceCertsPage from "./pages/ComplianceCertsPage";
import PostJobPage from "./pages/PostJobPage";
import DriverDashboard from "./pages/DriverDashboard";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BroadcastsPage from "./pages/BroadcastsPage";
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
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile-setup" element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            } />

            {/* Public / Customer layout (top nav) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/trader/:id" element={<TraderProfilePage />} />
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
            </Route>

            {/* Trader layout (sidebar desktop, bottom nav mobile) */}
            <Route element={
              <ProtectedRoute allowedRoles={["trade", "admin"]}>
                <KycGate>
                  <TraderLayout />
                </KycGate>
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<TraderDashboard />} />
              <Route path="/trade-accounts" element={<TradeAccountsPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/site-evidence" element={<SiteEvidencePage />} />
              <Route path="/compliance" element={<ComplianceCertsPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
            </Route>

            {/* Driver layout (sidebar desktop, bottom nav mobile) */}
            <Route element={
              <ProtectedRoute allowedRoles={["driver", "admin"]}>
                <KycGate>
                  <DriverLayout />
                </KycGate>
              </ProtectedRoute>
            }>
              <Route path="/driver" element={<DriverDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
