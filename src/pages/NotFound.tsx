import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Search, HardHat } from "lucide-react";
import craftvaroLogo from "@/assets/craftvaro-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-primary/8 blur-[180px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center max-w-md space-y-6"
      >
        <div className="flex flex-col items-center gap-5">
          <Link to="/" className="inline-flex">
            <img src={craftvaroLogo} alt="Craftvaro" className="h-9 dark:[filter:brightness(0)_invert(1)]" />
          </Link>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <HardHat className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold text-gradient">404</h1>
          <p className="text-xl font-semibold text-foreground">Page not found</p>
          <p className="text-muted-foreground leading-relaxed">
            Looks like this page is still under construction. Let's get you back on track.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg" className="gap-2 font-semibold">
            <Link to="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/marketplace">
              <Search className="h-4 w-4" />
              Find trades
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
