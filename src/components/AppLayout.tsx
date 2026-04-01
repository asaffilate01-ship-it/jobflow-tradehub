import { Outlet } from "react-router-dom";
import AppNav from "./AppNav";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
