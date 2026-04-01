import { Link } from "react-router-dom";
import { Truck } from "lucide-react";

const footerLinks = {
  Platform: [
    { label: "Find a Tradesperson", to: "/marketplace" },
    { label: "Post a Job", to: "/post-job" },
    { label: "Browse Jobs", to: "/jobs" },
    { label: "Pricing", to: "/subscription" },
  ],
  "For Trades": [
    { label: "Join as a Trader", to: "/signup" },
    { label: "Dashboard", to: "/dashboard" },
    { label: "Materials & Delivery", to: "/materials" },
    { label: "Compliance Certs", to: "/compliance" },
  ],
  Company: [
    { label: "About TradeFlow", to: "/" },
    { label: "Contact Us", to: "/" },
    { label: "Privacy Policy", to: "/" },
    { label: "Terms of Service", to: "/" },
  ],
};

const Footer = () => (
  <footer className="border-t border-border bg-card/50 mt-16">
    <div className="container py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1 space-y-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Trade<span className="text-primary">Flow</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            The UK's complete platform for finding trusted tradespeople and managing construction projects.
          </p>
        </div>

        {Object.entries(footerLinks).map(([heading, links]) => (
          <div key={heading}>
            <h4 className="text-sm font-semibold text-foreground mb-4">{heading}</h4>
            <ul className="space-y-2.5">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TradeFlow. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">
          Built in the UK 🇬🇧
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
