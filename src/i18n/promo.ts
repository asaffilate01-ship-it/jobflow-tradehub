import type { Lang } from "@/contexts/LanguageContext";

export interface PromoCopy {
  meta: { title: string; description: string };
  nav: { platform: string; roles: string; apps: string; faqs: string; home: string };
  cta: { access: string; demo: string; inside: string; enterPassword: string };
  hero: {
    badge: string;
    h1a: string;
    h1b: string;
    lede: string;
    stats: { value: string; label: string }[];
  };
  modules: { badge: string; heading: string; lede: string; tagLive: string; tagBeta: string; items: { title: string; desc: string; tag: "live" | "beta" }[] };
  roles: { badge: string; heading: string; lede: string; items: { title: string; points: string[] }[] };
  apps: {
    badge: string;
    heading: string;
    lede: string;
    captionDesktop: string;
    altWeb: string;
    altMobile: string;
    altApp: string;
  };
  faqs: { badge: string; heading: string; items: { q: string; a: string }[] };
  access: { heading: string; lede: string };
  footer: { rights: string };
}

const en: PromoCopy = {
  meta: {
    title: "Craftvaro — Find. Hire. Done. | Trade marketplace, materials & delivery",
    description:
      "Craftvaro is the all-in-one platform for trades: a verified job marketplace, materials at trade price, delivery logistics, site evidence, compliance and accounting — on web and mobile.",
  },
  nav: { platform: "Platform", roles: "Roles", apps: "Apps", faqs: "FAQs", home: "Home" },
  cta: {
    access: "Platform access",
    demo: "Request a demo",
    inside: "See what's inside",
    enterPassword: "Enter access password",
  },
  hero: {
    badge: "Launching in the UK",
    h1a: "Find. Hire.",
    h1b: "Done.",
    lede:
      "Craftvaro is the operating system for the trade — a verified marketplace, materials at trade price, delivery logistics, site evidence and accounting in one app for customers, trades and drivers.",
    stats: [
      { value: "4", label: "Role-based portals" },
      { value: "30+", label: "Screens shipped" },
      { value: "12", label: "Product modules" },
      { value: "24/7", label: "Job & delivery flow" },
    ],
  },
  modules: {
    badge: "The platform",
    heading: "Everything we've built, in one system",
    lede:
      "Twelve modules that cover a job from the first enquiry to the final invoice — no spreadsheets, no WhatsApp threads, no lost paperwork.",
    tagLive: "Live",
    tagBeta: "Beta",
    items: [
      { title: "Job marketplace", desc: "Customers post work, verified trades quote, both sides track it to completion — with ratings and reviews baked in.", tag: "live" },
      { title: "Materials at trade price", desc: "Search merchant catalogues, compare live prices across suppliers, and order to site in a few taps.", tag: "live" },
      { title: "Delivery & logistics", desc: "Priced by distance, manpower and load. Drivers accept jobs, update status and get paid per run.", tag: "live" },
      { title: "Site evidence", desc: "Timestamped photo capture, galleries per project and shareable proof-of-work for clients and insurers.", tag: "live" },
      { title: "Compliance & KYC", desc: "Certificates, insurance and ID verification gated before a trade can win work on the platform.", tag: "live" },
      { title: "Scheduling & daily logs", desc: "Calendar, list and year views for crews, plus daily site logs that build an audit trail per job.", tag: "live" },
      { title: "Accounting & payouts", desc: "Order receipts, invoices, commission splits and driver payout records in one ledger.", tag: "beta" },
      { title: "Messaging & alerts", desc: "In-app threads on every job with push notifications for quotes, approvals and deliveries.", tag: "live" },
      { title: "Admin & analytics", desc: "User management, KYC review, audit log, broadcasts and platform-wide analytics.", tag: "live" },
      { title: "Agents & referrals", desc: "Referral links, commission tracking and agent dashboards to grow supply on the ground.", tag: "live" },
      { title: "Tiered subscriptions", desc: "Free, Basic and Premium plans with server-verified access to every premium module.", tag: "live" },
      { title: "PWA & native ready", desc: "Installable app, offline shell, push notifications and native builds for iOS and Android.", tag: "live" },
    ],
  },
  roles: {
    badge: "Who it's for",
    heading: "One platform, four portals",
    lede:
      "Every role gets a purpose-built experience — with permissions, verification and billing handled behind the scenes.",
    items: [
      { title: "For customers", points: ["Post a job free", "Compare verified quotes", "Track progress & photos", "Pay with confidence"] },
      { title: "For trades", points: ["Win local work", "Materials at trade price", "Quotes, scheduling, logs", "Compliance in one place"] },
      { title: "For drivers", points: ["Accept delivery runs", "Distance-based pricing", "Proof of delivery", "Weekly payouts"] },
    ],
  },
  apps: {
    badge: "Web + mobile",
    heading: "Built for the office and the site",
    lede:
      "The same data, everywhere — a full desktop workspace and a native-feel mobile app with bottom navigation, camera capture and offline support.",
    captionDesktop: "Craftvaro on desktop — marketplace, jobs and dashboards",
    altWeb: "Craftvaro web platform screenshot",
    altMobile: "Craftvaro mobile web screenshot",
    altApp: "Craftvaro native app screens",
  },
  faqs: {
    badge: "FAQs",
    heading: "Questions, answered",
    items: [
      { q: "What exactly is Craftvaro?", a: "Craftvaro is an end-to-end platform for the construction trade: a marketplace that connects customers with verified tradespeople, a materials ordering engine with live merchant pricing, and a delivery network that gets those materials to site." },
      { q: "Who is it for?", a: "Four roles share one system — customers hiring work, tradespeople running jobs, drivers moving materials, and admins overseeing verification, payouts and analytics." },
      { q: "Is there a mobile app?", a: "Yes. Craftvaro installs as a PWA on any phone and ships as a native iOS and Android build, with native-style bottom navigation, camera capture for site evidence and push notifications." },
      { q: "How does materials pricing work?", a: "We pull catalogues and live prices from merchant accounts, compare them per line item, and show trade-price totals before you order. Delivery is quoted from base rate, distance, manpower and load." },
      { q: "How are tradespeople verified?", a: "Every trade completes KYC — ID, insurance and trade certificates — reviewed by our admin team before they can quote. Compliance certificates stay on file and are visible to customers." },
      { q: "What does it cost?", a: "Customers post jobs free. Trades choose Free, Basic or Premium — Basic unlocks quoting and messaging, Premium unlocks materials, deliveries, site evidence, scheduling, compliance and accounting." },
      { q: "Can I see the live platform?", a: "The full platform is behind a password during our launch phase. Request access and we'll send you credentials for a guided walkthrough." },
    ],
  },
  access: {
    heading: "The live platform is invite-only",
    lede:
      "We're onboarding trades, merchants and drivers in waves. Already have an access password? Unlock the full platform below.",
  },
  footer: { rights: "All rights reserved." },
};

const de: PromoCopy = {
  meta: {
    title: "Craftvaro — Finden. Beauftragen. Erledigt. | Handwerker, Material & Lieferung",
    description:
      "Craftvaro ist die All-in-One-Plattform für das Handwerk: geprüfter Auftragsmarktplatz, Material zu Handwerkerpreisen, Lieferlogistik, Baustellen-Dokumentation, Compliance und Buchhaltung — im Web und mobil.",
  },
  nav: { platform: "Plattform", roles: "Rollen", apps: "Apps", faqs: "FAQ", home: "Start" },
  cta: {
    access: "Plattform-Zugang",
    demo: "Demo anfragen",
    inside: "Alle Funktionen ansehen",
    enterPassword: "Zugangspasswort eingeben",
  },
  hero: {
    badge: "Jetzt im Aufbau",
    h1a: "Finden. Beauftragen.",
    h1b: "Erledigt.",
    lede:
      "Craftvaro ist das Betriebssystem für das Handwerk — geprüfter Marktplatz, Material zu Handwerkerpreisen, Lieferlogistik, Baustellen-Dokumentation und Buchhaltung in einer App für Kunden, Handwerksbetriebe und Fahrer.",
    stats: [
      { value: "4", label: "Rollenbasierte Portale" },
      { value: "30+", label: "Fertige Ansichten" },
      { value: "12", label: "Produktmodule" },
      { value: "24/7", label: "Auftrag & Lieferung" },
    ],
  },
  modules: {
    badge: "Die Plattform",
    heading: "Alles, was wir gebaut haben — in einem System",
    lede:
      "Zwölf Module decken einen Auftrag von der ersten Anfrage bis zur Schlussrechnung ab — keine Tabellen, keine WhatsApp-Ketten, keine verlorenen Unterlagen.",
    tagLive: "Live",
    tagBeta: "Beta",
    items: [
      { title: "Auftragsmarktplatz", desc: "Kunden stellen Aufträge ein, geprüfte Betriebe geben Angebote ab, beide Seiten verfolgen alles bis zur Abnahme — inklusive Bewertungen.", tag: "live" },
      { title: "Material zu Handwerkerpreisen", desc: "Händlerkataloge durchsuchen, Live-Preise vergleichen und mit wenigen Klicks auf die Baustelle bestellen.", tag: "live" },
      { title: "Lieferung & Logistik", desc: "Preis nach Entfernung, Personal und Ladung. Fahrer nehmen Fahrten an, aktualisieren den Status und werden pro Fahrt bezahlt.", tag: "live" },
      { title: "Baustellen-Dokumentation", desc: "Fotos mit Zeitstempel, Galerien pro Projekt und teilbare Arbeitsnachweise für Kunden und Versicherer.", tag: "live" },
      { title: "Compliance & KYC", desc: "Zertifikate, Versicherung und Identitätsprüfung — verpflichtend, bevor ein Betrieb Aufträge gewinnen kann.", tag: "live" },
      { title: "Planung & Bautagebuch", desc: "Kalender-, Listen- und Jahresansicht für Teams sowie tägliche Baustellenberichte als Nachweiskette.", tag: "live" },
      { title: "Buchhaltung & Auszahlungen", desc: "Belege, Rechnungen, Provisionsaufteilung und Fahrer-Auszahlungen in einem Buchungsjournal.", tag: "beta" },
      { title: "Nachrichten & Benachrichtigungen", desc: "Chat zu jedem Auftrag mit Push-Benachrichtigungen für Angebote, Freigaben und Lieferungen.", tag: "live" },
      { title: "Admin & Analysen", desc: "Nutzerverwaltung, KYC-Prüfung, Audit-Log, Rundschreiben und plattformweite Auswertungen.", tag: "live" },
      { title: "Vertriebspartner & Empfehlungen", desc: "Empfehlungslinks, Provisions-Tracking und Partner-Dashboards für schnelleres Wachstum.", tag: "live" },
      { title: "Abo-Stufen", desc: "Free, Basic und Premium mit serverseitig geprüftem Zugriff auf alle Premium-Module.", tag: "live" },
      { title: "PWA & native App", desc: "Installierbare App, Offline-Modus, Push-Benachrichtigungen und native Builds für iOS und Android.", tag: "live" },
    ],
  },
  roles: {
    badge: "Für wen",
    heading: "Eine Plattform, vier Portale",
    lede:
      "Jede Rolle erhält eine eigene Oberfläche — Berechtigungen, Verifizierung und Abrechnung laufen im Hintergrund.",
    items: [
      { title: "Für Kunden", points: ["Auftrag kostenlos einstellen", "Geprüfte Angebote vergleichen", "Fortschritt & Fotos verfolgen", "Sicher bezahlen"] },
      { title: "Für Handwerksbetriebe", points: ["Aufträge in der Region gewinnen", "Material zu Handwerkerpreisen", "Angebote, Planung, Berichte", "Compliance an einem Ort"] },
      { title: "Für Fahrer", points: ["Lieferfahrten annehmen", "Preis nach Entfernung", "Liefernachweis", "Wöchentliche Auszahlung"] },
    ],
  },
  apps: {
    badge: "Web + Mobil",
    heading: "Gemacht für Büro und Baustelle",
    lede:
      "Dieselben Daten überall — ein vollwertiger Desktop-Arbeitsplatz und eine App mit nativem Gefühl, Bottom-Navigation, Kamera-Aufnahme und Offline-Unterstützung.",
    captionDesktop: "Craftvaro am Desktop — Marktplatz, Aufträge und Dashboards",
    altWeb: "Screenshot der Craftvaro Web-Plattform auf Deutsch",
    altMobile: "Screenshot der mobilen Craftvaro-Ansicht auf Deutsch",
    altApp: "Craftvaro App-Ansichten auf Deutsch",
  },
  faqs: {
    badge: "FAQ",
    heading: "Häufige Fragen",
    items: [
      { q: "Was genau ist Craftvaro?", a: "Craftvaro ist eine Komplettplattform für das Bau- und Handwerksgeschäft: ein Marktplatz, der Kunden mit geprüften Betrieben verbindet, eine Materialbestellung mit Live-Händlerpreisen und ein Liefernetzwerk, das das Material auf die Baustelle bringt." },
      { q: "Für wen ist die Plattform?", a: "Vier Rollen teilen ein System — Kunden, die Aufträge vergeben, Betriebe, die Aufträge abwickeln, Fahrer, die Material transportieren, und Admins für Prüfung, Auszahlungen und Analysen." },
      { q: "Gibt es eine mobile App?", a: "Ja. Craftvaro lässt sich als PWA auf jedem Smartphone installieren und erscheint als native iOS- und Android-App — mit nativer Bottom-Navigation, Kamera für Baustellen-Nachweise und Push-Benachrichtigungen." },
      { q: "Wie funktioniert die Materialpreisfindung?", a: "Wir holen Kataloge und Live-Preise aus Händlerkonten, vergleichen sie pro Position und zeigen die Handwerkerpreise vor der Bestellung. Die Lieferung wird aus Grundpreis, Entfernung, Personal und Ladung berechnet." },
      { q: "Wie werden Betriebe geprüft?", a: "Jeder Betrieb durchläuft KYC — Ausweis, Versicherung und Qualifikationsnachweise — geprüft von unserem Team, bevor Angebote abgegeben werden dürfen. Zertifikate bleiben hinterlegt und sind für Kunden sichtbar." },
      { q: "Was kostet Craftvaro?", a: "Kunden stellen Aufträge kostenlos ein. Betriebe wählen Free, Basic oder Premium — Basic schaltet Angebote und Nachrichten frei, Premium zusätzlich Material, Lieferungen, Dokumentation, Planung, Compliance und Buchhaltung." },
      { q: "Kann ich die Live-Plattform sehen?", a: "Die vollständige Plattform ist in der Startphase passwortgeschützt. Fragen Sie Zugang an, und wir senden Ihnen Zugangsdaten für eine geführte Tour." },
    ],
  },
  access: {
    heading: "Die Live-Plattform ist auf Einladung",
    lede:
      "Wir nehmen Betriebe, Händler und Fahrer in Wellen auf. Sie haben schon ein Zugangspasswort? Dann öffnen Sie hier die vollständige Plattform.",
  },
  footer: { rights: "Alle Rechte vorbehalten." },
};

export const promoCopy: Record<Lang, PromoCopy> = { en, de };
