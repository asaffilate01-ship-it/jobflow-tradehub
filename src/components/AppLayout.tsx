import { Outlet } from "react-router-dom";
import AppNav from "./AppNav";
import Footer from "./Footer";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="container py-8 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
