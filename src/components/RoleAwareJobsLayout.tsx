import AppLayout from "@/components/AppLayout";
import KycGate from "@/components/KycGate";
import TraderLayout from "@/components/TraderLayout";
import { useAuth } from "@/contexts/AuthContext";

/**
 * `/jobs` is shared by customers and traders. React Router cannot fall through
 * between two identical route branches after a role guard redirects, so choose
 * the correct shell before rendering the shared child route.
 */
const RoleAwareJobsLayout = () => {
  const { roles } = useAuth();
  const usesTraderPortal = roles.some((role) => ["trade", "admin", "staff"].includes(role));

  if (usesTraderPortal) {
    return (
      <KycGate>
        <TraderLayout />
      </KycGate>
    );
  }

  return <AppLayout />;
};

export default RoleAwareJobsLayout;
