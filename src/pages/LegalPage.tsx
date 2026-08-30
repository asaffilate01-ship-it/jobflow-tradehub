import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageMeta } from "@/hooks/use-page-meta";

type LegalKind = "privacy" | "terms" | "cookies";

const copy = {
  en: {
    privacy: {
      title: "Privacy policy",
      intro: "How Craftvaro uses and protects personal information.",
      sections: [
        ["Who controls your data", "Craftvaro is a trading name of iTechLounge Ltd. Contact privacy@craftvaro.com about privacy or data rights."],
        ["What we collect", "We process account and profile information, subscription status, job and quotation records, messages, approximate and accepted-job locations, repair media, safety assessments, evidence records, device and security logs, and support communications."],
        ["Why we use it", "We use information to provide the marketplace, verify paid traders and credentials, match jobs, prevent fraud, operate Repair Assist, maintain evidence and audit trails, support users, and meet legal obligations. Where consent is needed, you may withdraw it."],
        ["Repair photos and video", "Original repair media is private. Providers and Dokuvera receive media only after an approved redaction process marks a separate copy as safe. Automated assessments are indicative and do not replace a qualified professional."],
        ["Sharing", "Information is shared only with selected or invited marketplace participants as needed, and with contracted infrastructure, payment, notification, AI-processing and evidence providers. Full job addresses are released only after an offer is accepted, except where law or safety requires otherwise."],
        ["Retention and security", "We keep records only as long as necessary for service, safety, tax, warranty, dispute and legal needs. Access is restricted, logged where appropriate, and protected with encryption and row-level permissions."],
        ["Your rights", "Depending on your location, you may request access, correction, deletion, restriction, portability or objection. Use Account deletion when signed in, or email privacy@craftvaro.com. You may also complain to the UK Information Commissioner’s Office."],
      ],
    },
    terms: {
      title: "Terms of service",
      intro: "The rules for using Craftvaro’s subscription marketplace.",
      sections: [
        ["Marketplace role", "Craftvaro is open to everyone: browsing the marketplace is free, a free account unlocks AI features, and businesses pay a membership. Craftvaro connects customers with independently operated, subscribing tradespeople. Unless clearly stated for a specific service, Craftvaro is not the contractor and is not a party to the repair contract between customer and trader."],
        ["Trader membership", "Only traders with an active paid or trial subscription may be shown, receive leads or submit offers. Traders must keep identity, insurance, qualifications, availability, pricing and service-area information accurate and current."],
        ["AI Repair Assist", "Possible causes, urgency and cost ranges are informational estimates. They are not a diagnosis, quotation or instruction to perform regulated work. Emergency guidance takes priority, and a qualified professional must inspect and confirm the work."],
        ["Offers and jobs", "A trader’s offer sets the commercial terms, subject to clearly approved variations. Customers must provide accurate job information and safe access. Exact addresses are disclosed only to the selected provider after acceptance."],
        ["Safety and regulated work", "Users must follow emergency instructions and applicable law. Gas, electrical, asbestos and other regulated work must be completed by appropriately qualified and authorised professionals."],
        ["Acceptable use", "Do not misuse accounts, scrape profiles, bypass subscription controls, submit false credentials, harass users, upload unlawful material, or attempt to access another user’s information."],
        ["Liability and changes", "Nothing excludes liability that cannot legally be excluded. Subject to that, the service is provided with reasonable care but availability and AI output are not guaranteed. Material changes will be communicated where required."],
      ],
    },
    cookies: {
      title: "Cookie policy",
      intro: "How browser storage is used on Craftvaro.",
      sections: [
        ["Essential storage", "Craftvaro uses essential cookies or local storage for authentication, security, language, accessibility and saved consent choices. These are necessary to provide the service."],
        ["Analytics and marketing", "Non-essential analytics or marketing technologies must remain disabled until you make a choice through a consent control. The production team must record and maintain the exact vendor list here before enabling them."],
        ["Your choices", "You can clear browser storage or block cookies in your browser. Blocking essential storage may prevent sign-in and other core features from working."],
      ],
    },
  },
  de: {
    privacy: {
      title: "Datenschutzerklärung",
      intro: "Wie Craftvaro personenbezogene Daten verwendet und schützt.",
      sections: [
        ["Verantwortlicher", "Craftvaro ist ein Handelsname der iTechLounge GmbH. Datenschutzanfragen können an privacy@craftvaro.com gerichtet werden."],
        ["Verarbeitete Daten", "Wir verarbeiten Konto- und Profildaten, Abonnementstatus, Aufträge, Angebote, Nachrichten, ungefähre und nach Auftragsannahme vollständige Standorte, Reparaturmedien, Sicherheitsbewertungen, Nachweise, Geräte- und Sicherheitsprotokolle sowie Supportanfragen."],
        ["Zwecke", "Wir verwenden Daten, um den Marktplatz bereitzustellen, zahlende Betriebe und Nachweise zu prüfen, Aufträge zu vermitteln, Betrug zu verhindern, Repair Assist zu betreiben, Nachweise zu führen, Support zu leisten und rechtliche Pflichten zu erfüllen."],
        ["Reparaturfotos und -videos", "Originalmedien bleiben privat. Betriebe und Dokuvera erhalten Medien nur, wenn eine getrennte Kopie durch den Freigabeprozess als sicher markiert wurde. Automatische Bewertungen ersetzen keine Fachkraft."],
        ["Weitergabe", "Daten werden nur soweit erforderlich mit ausgewählten Marktteilnehmern und beauftragten Infrastruktur-, Zahlungs-, Benachrichtigungs-, KI- und Nachweisdiensten geteilt. Die vollständige Adresse wird grundsätzlich erst nach Annahme eines Angebots freigegeben."],
        ["Speicherung und Sicherheit", "Daten werden nur so lange aufbewahrt, wie dies für Service, Sicherheit, Steuern, Garantie, Streitfälle und rechtliche Pflichten nötig ist. Zugriffe werden eingeschränkt und angemessen geschützt."],
        ["Ihre Rechte", "Je nach Aufenthaltsort können Sie Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit oder Widerspruch verlangen. Nutzen Sie die Kontolöschung oder schreiben Sie an privacy@craftvaro.com."],
      ],
    },
    terms: {
      title: "Nutzungsbedingungen",
      intro: "Regeln für den Craftvaro-Abonnement-Marktplatz.",
      sections: [
        ["Rolle des Marktplatzes", "Der Marktplatz ist für alle offen: Suchen ist kostenlos, ein kostenloses Konto schaltet KI-Funktionen frei, und Betriebe zahlen eine Mitgliedschaft. Craftvaro verbindet Kunden mit selbstständigen, abonnierenden Handwerksbetrieben. Soweit nicht ausdrücklich anders angegeben, ist Craftvaro nicht Auftragnehmer und nicht Partei des Vertrags zwischen Kunde und Betrieb."],
        ["Mitgliedschaft", "Nur Betriebe mit aktivem bezahltem oder Test-Abonnement dürfen angezeigt werden, Anfragen erhalten oder Angebote abgeben. Identität, Versicherung, Qualifikationen, Verfügbarkeit, Preise und Einsatzgebiet müssen aktuell sein."],
        ["AI Repair Assist", "Mögliche Ursachen, Dringlichkeit und Kostenbereiche sind unverbindliche Hinweise. Sie sind weder Diagnose noch Angebot oder Anleitung für regulierte Arbeiten. Sicherheitsanweisungen haben Vorrang; eine Fachkraft muss den Auftrag prüfen."],
        ["Angebote und Aufträge", "Das Angebot des Betriebs bestimmt die Konditionen, vorbehaltlich ausdrücklich bestätigter Änderungen. Kunden müssen richtige Angaben und sicheren Zugang gewährleisten. Die genaue Adresse wird erst nach Annahme freigegeben."],
        ["Sicherheit", "Notfallhinweise und geltendes Recht sind einzuhalten. Gas-, Elektro-, Asbest- und andere regulierte Arbeiten dürfen nur entsprechend qualifizierte Fachkräfte durchführen."],
        ["Zulässige Nutzung", "Konten dürfen nicht missbraucht, Profile nicht automatisiert kopiert, Abonnementkontrollen nicht umgangen und keine falschen Nachweise oder rechtswidrigen Inhalte übermittelt werden."],
        ["Haftung und Änderungen", "Zwingende gesetzliche Haftung bleibt unberührt. Im Übrigen wird der Dienst mit angemessener Sorgfalt angeboten; Verfügbarkeit und KI-Ergebnisse werden nicht garantiert. Wesentliche Änderungen werden, soweit erforderlich, mitgeteilt."],
      ],
    },
    cookies: {
      title: "Cookie-Richtlinie",
      intro: "Wie Craftvaro Browser-Speicher verwendet.",
      sections: [
        ["Notwendige Speicherung", "Craftvaro verwendet notwendige Cookies oder lokalen Speicher für Anmeldung, Sicherheit, Sprache, Barrierefreiheit und gespeicherte Einwilligungen."],
        ["Analyse und Marketing", "Nicht notwendige Analyse- oder Marketingdienste müssen deaktiviert bleiben, bis eine Einwilligung erteilt wurde. Vor Aktivierung muss die Produktionsverantwortung hier alle Anbieter dokumentieren."],
        ["Ihre Auswahl", "Sie können Browser-Speicher löschen oder Cookies blockieren. Das Blockieren notwendiger Speicherung kann Anmeldung und Kernfunktionen verhindern."],
      ],
    },
  },
} as const;

export default function LegalPage() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const candidate = pathname.slice(1);
  const legalKind: LegalKind = candidate === "terms" || candidate === "cookies" ? candidate : "privacy";
  const page = copy[lang][legalKind];
  usePageMeta(page.title, page.intro);
  return (
    <main className="container max-w-3xl py-12 sm:py-16">
      <p className="text-sm text-muted-foreground">Last updated: 30 August 2026</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{page.intro}</p>
      <div className="mt-10 space-y-8">
        {page.sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-semibold">{heading}</h2><p className="mt-2 leading-7 text-muted-foreground">{body}</p></section>)}
      </div>
      <div className="mt-10 flex flex-wrap gap-4 text-sm"><Link className="text-primary hover:underline" to="/privacy">Privacy</Link><Link className="text-primary hover:underline" to="/terms">Terms</Link><Link className="text-primary hover:underline" to="/cookies">Cookies</Link></div>
    </main>
  );
}
