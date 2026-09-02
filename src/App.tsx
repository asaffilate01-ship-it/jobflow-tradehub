import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazy-retry";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import AppLayout from "./components/AppLayout";
import RoleAwareJobsLayout from "./components/RoleAwareJobsLayout";
import ScrollToTop from "./components/ScrollToTop";
import TraderLayout from "./components/TraderLayout";
import DriverLayout from "./components/DriverLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import KycGate from "./components/KycGate";
import TierGate from "./components/TierGate";
import CookieNotice from "./components/CookieNotice";

import PromoGate, { UnlockScreen } from "./components/PromoGate";
import PromoHomePage from "./pages/PromoHomePage";
import AgentLayout from "./components/AgentLayout";
import AdminLayout from "./components/AdminLayout";

const SmartOrderPage = lazyWithRetry(() => import("./pages/SmartOrderPage"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const JobsPage = lazyWithRetry(() => import("./pages/JobsPage"));
const JobDetailPage = lazyWithRetry(() => import("./pages/JobDetailPage"));
const SubmitQuotePage = lazyWithRetry(() => import("./pages/SubmitQuotePage"));
const MaterialsPage = lazyWithRetry(() => import("./pages/MaterialsPage"));
const DeliveriesPage = lazyWithRetry(() => import("./pages/DeliveriesPage"));
const MarketplacePage = lazyWithRetry(() => import("./pages/MarketplacePage"));
const TraderProfilePage = lazyWithRetry(() => import("./pages/TraderProfilePage"));
const TraderDashboard = lazyWithRetry(() => import("./pages/TraderDashboard"));
const TradeAccountsPage = lazyWithRetry(() => import("./pages/TradeAccountsPage"));
const ProfileSetupPage = lazyWithRetry(() => import("./pages/ProfileSetupPage"));
const LoginPage = lazyWithRetry(() => import("./pages/LoginPage"));
const SignupPage = lazyWithRetry(() => import("./pages/SignupPage"));
const SubscriptionPage = lazyWithRetry(() => import("./pages/SubscriptionPage"));
const MessagesPage = lazyWithRetry(() => import("./pages/MessagesPage"));
const SiteEvidencePage = lazyWithRetry(() => import("./pages/SiteEvidencePage"));
const SiteEvidenceProjectPage = lazyWithRetry(() => import("./pages/SiteEvidenceProjectPage"));
const EvidenceCameraPage = lazyWithRetry(() => import("./pages/EvidenceCameraPage"));
const EvidenceGalleryPage = lazyWithRetry(() => import("./pages/EvidenceGalleryPage"));
const ComplianceCertsPage = lazyWithRetry(() => import("./pages/ComplianceCertsPage"));
const PostJobPage = lazyWithRetry(() => import("./pages/PostJobPage"));
const RepairAssistPage = lazyWithRetry(() => import("./pages/RepairAssistPage"));
const RepairOpportunitiesPage = lazyWithRetry(() => import("./pages/RepairOpportunitiesPage"));
const DriverDashboard = lazyWithRetry(() => import("./pages/DriverDashboard"));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage"));
const BroadcastsPage = lazyWithRetry(() => import("./pages/BroadcastsPage"));
const KycUploadPage = lazyWithRetry(() => import("./pages/KycUploadPage"));
const AdminKycPage = lazyWithRetry(() => import("./pages/AdminKycPage"));
const SchedulePage = lazyWithRetry(() => import("./pages/SchedulePage"));
const DailyLogsPage = lazyWithRetry(() => import("./pages/DailyLogsPage"));
const CustomerPortalPage = lazyWithRetry(() => import("./pages/CustomerPortalPage"));
const OrderReceiptPage = lazyWithRetry(() => import("./pages/OrderReceiptPage"));
const VerifyOrderPage = lazyWithRetry(() => import("./pages/VerifyOrderPage"));
const AgentDashboard = lazyWithRetry(() => import("./pages/AgentDashboard"));
const AgentReferralsPage = lazyWithRetry(() => import("./pages/AgentReferralsPage"));
const AgentCommissionsPage = lazyWithRetry(() => import("./pages/AgentCommissionsPage"));
const AgentAnalyticsPage = lazyWithRetry(() => import("./pages/AgentAnalyticsPage"));
const AgentReferralLinkPage = lazyWithRetry(() => import("./pages/AgentReferralLinkPage"));
const AccountingPage = lazyWithRetry(() => import("./pages/AccountingPage"));
const AdminDashboardPage = lazyWithRetry(() => import("./pages/AdminDashboardPage"));
const AdminUsersPage = lazyWithRetry(() => import("./pages/AdminUsersPage"));
const AdminAnalyticsPage = lazyWithRetry(() => import("./pages/AdminAnalyticsPage"));
const AdminAgentsPage = lazyWithRetry(() => import("./pages/AdminAgentsPage"));
const AdminAuditLogPage = lazyWithRetry(() => import("./pages/AdminAuditLogPage"));
const AdminRepairProvidersPage = lazyWithRetry(() => import("./pages/AdminRepairProvidersPage"));
const AdminTraderDirectoryPage = lazyWithRetry(() => import("./pages/AdminTraderDirectoryPage"));
const AdminLaunchReadinessPage = lazyWithRetry(() => import("./pages/AdminLaunchReadinessPage"));
const AdminDeletionRequestsPage = lazyWithRetry(() => import("./pages/AdminDeletionRequestsPage"));
const AdminIntegrationOperationsPage = lazyWithRetry(() => import("./pages/AdminIntegrationOperationsPage"));
const ClaimTraderProfilePage = lazyWithRetry(() => import("./pages/ClaimTraderProfilePage"));
const LegalPage = lazyWithRetry(() => import("./pages/LegalPage"));
const DeleteAccountPage = lazyWithRetry(() => import("./pages/DeleteAccountPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
          <Routes>
            {/* Promo homepage — public, default */}
            <Route path="/" element={<PromoHomePage />} />
            <Route path="/unlock" element={<UnlockScreen />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/cookies" element={<LegalPage />} />

            {/* Everything below requires the promo access password */}
            <Route element={<PromoGate><Outlet /></PromoGate>}>
            {/* Public pages */}

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-order/:orderId" element={<VerifyOrderPage />} />
            <Route path="/profile-setup" element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            } />

            {/* Shared job routes use a role-aware shell to avoid duplicate-route redirects. */}
            <Route element={<RoleAwareJobsLayout />}>
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
            </Route>


            {/* Full-screen camera (outside layout — no sidebar/nav) */}
            <Route path="/site-evidence/:jobId/camera" element={
              <ProtectedRoute allowedRoles={["trade", "admin"]}>
                <EvidenceCameraPage />
              </ProtectedRoute>
            } />

            {/* Trader layout (sidebar desktop, bottom nav mobile) — BEFORE AppLayout so authenticated traders match first */}
            <Route element={
              <ProtectedRoute allowedRoles={["trade", "admin", "staff"]}>
                <KycGate>
                  <TraderLayout />
                </KycGate>
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<TraderDashboard />} />
              <Route path="/repair-opportunities" element={<RepairOpportunitiesPage />} />
              <Route path="/jobs/:jobId/quote" element={<TierGate required="basic" feature="Quoting"><SubmitQuotePage /></TierGate>} />
              <Route path="/trade-accounts" element={<TierGate required="premium" feature="Trade accounts"><TradeAccountsPage /></TierGate>} />
              <Route path="/materials" element={<TierGate required="premium" feature="Material ordering"><MaterialsPage /></TierGate>} />
              <Route path="/smart-order" element={<TierGate required="premium" feature="Smart ordering"><SmartOrderPage /></TierGate>} />
              <Route path="/site-evidence" element={<TierGate required="premium" feature="Site evidence"><SiteEvidencePage /></TierGate>} />
              <Route path="/site-evidence/:jobId" element={<TierGate required="premium" feature="Site evidence"><SiteEvidenceProjectPage /></TierGate>} />
              <Route path="/site-evidence/:jobId/gallery" element={<TierGate required="premium" feature="Site evidence"><EvidenceGalleryPage /></TierGate>} />
              <Route path="/compliance" element={<TierGate required="premium" feature="Compliance certificates"><ComplianceCertsPage /></TierGate>} />
              <Route path="/deliveries" element={<TierGate required="premium" feature="Deliveries"><DeliveriesPage /></TierGate>} />
              <Route path="/messages" element={<TierGate required="basic" feature="Messaging"><MessagesPage /></TierGate>} />
              <Route path="/broadcasts" element={<BroadcastsPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/kyc-upload" element={<KycUploadPage />} />
              <Route path="/schedule" element={<TierGate required="premium" feature="Scheduling"><SchedulePage /></TierGate>} />
              <Route path="/daily-logs" element={<TierGate required="premium" feature="Daily logs"><DailyLogsPage /></TierGate>} />
              <Route path="/daily-logs/:jobId" element={<TierGate required="premium" feature="Daily logs"><DailyLogsPage /></TierGate>} />
              <Route path="/orders/:orderId/receipt" element={<OrderReceiptPage />} />
              <Route path="/accounting" element={<TierGate required="premium" feature="Accounting"><AccountingPage /></TierGate>} />
            </Route>


            {/* Public / Customer layout (top nav) */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<LandingPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/trader/:id" element={<TraderProfilePage />} />
              <Route path="/claim-trader/:id" element={
                <ProtectedRoute>
                  <ClaimTraderProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/post-job" element={
                <ProtectedRoute>
                  <PostJobPage />
                </ProtectedRoute>
              } />
              <Route path="/repair-assist" element={
                <ProtectedRoute allowedRoles={["customer", "admin"]}>
                  <RepairAssistPage />
                </ProtectedRoute>
              } />
              <Route path="/my-projects" element={
                <ProtectedRoute allowedRoles={["customer", "admin"]}>
                  <CustomerPortalPage />
                </ProtectedRoute>
              } />
              <Route path="/account/delete" element={
                <ProtectedRoute>
                  <DeleteAccountPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Admin layout */}
            <Route element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/kyc-review" element={<AdminKycPage />} />
              <Route path="/admin/repair-providers" element={<AdminRepairProvidersPage />} />
              <Route path="/admin/trader-directory" element={<AdminTraderDirectoryPage />} />
              <Route path="/admin/launch-readiness" element={<AdminLaunchReadinessPage />} />
              <Route path="/admin/deletion-requests" element={<AdminDeletionRequestsPage />} />
              <Route path="/admin/integration-operations" element={<AdminIntegrationOperationsPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
              <Route path="/admin/commissions" element={<AgentCommissionsPage />} />
              <Route path="/admin/broadcasts" element={<BroadcastsPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
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
              <Route path="/driver/deliveries" element={<DeliveriesPage />} />
              <Route path="/driver/broadcasts" element={<BroadcastsPage />} />
              <Route path="/driver/kyc-upload" element={<KycUploadPage />} />
              <Route path="/driver/orders/:orderId/receipt" element={<OrderReceiptPage />} />
            </Route>

            {/* Agent layout (sidebar desktop, bottom nav mobile) */}
            <Route element={
              <ProtectedRoute allowedRoles={["agent", "admin"]}>
                <AgentLayout />
              </ProtectedRoute>
            }>
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/agent/referrals" element={<AgentReferralsPage />} />
              <Route path="/agent/commissions" element={<AgentCommissionsPage />} />
              <Route path="/agent/analytics" element={<AgentAnalyticsPage />} />
              <Route path="/agent/referral-link" element={<AgentReferralLinkPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </Suspense>
          <CookieNotice />

        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
