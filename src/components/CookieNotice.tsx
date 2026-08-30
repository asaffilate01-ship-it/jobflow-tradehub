import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const KEY = "craftvaro-essential-storage-notice";

export default function CookieNotice() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(() => localStorage.getItem(KEY) !== "acknowledged");
  if (!visible) return null;
  const dismiss = () => { localStorage.setItem(KEY, "acknowledged"); setVisible(false); };
  return <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-xl border bg-background p-4 shadow-xl" aria-label="Cookie notice">
    <p className="text-sm text-muted-foreground">{lang === "de" ? "Craftvaro verwendet notwendigen Browser-Speicher für Anmeldung, Sicherheit und Sprache. Nicht notwendige Dienste bleiben ohne Einwilligung deaktiviert." : "Craftvaro uses essential browser storage for sign-in, security and language. Non-essential services remain disabled without consent."}</p>
    <div className="mt-3 flex items-center gap-3"><Button size="sm" onClick={dismiss}>{lang === "de" ? "Verstanden" : "Understood"}</Button><Link to="/cookies" className="text-sm text-primary hover:underline">{lang === "de" ? "Mehr erfahren" : "Learn more"}</Link></div>
  </aside>;
}
