export type PilotCheckStatus = "not_run" | "pass" | "fail" | "blocked";

export interface PilotCheckLike {
  required: boolean;
  status: PilotCheckStatus;
}

export const pilotCheckLabels: Record<string, { en: string; de: string }> = {
  paid_supply_10: { en: "10 verified paid/trial traders are lead-eligible", de: "10 verifizierte zahlende/Test-Händler sind für Anfragen berechtigt" },
  repair_supply_4: { en: "Four verified repair providers cover the pilot area", de: "Vier verifizierte Reparaturanbieter decken das Pilotgebiet ab" },
  claimable_directory_boundary: { en: "Claimable listings stay visible without lead/contact access", de: "Beanspruchbare Einträge bleiben ohne Anfrage-/Kontaktzugriff sichtbar" },
  customer_auth_persistence: { en: "Customer account and profile survive reload", de: "Kundenkonto und Profil bleiben nach Neuladen erhalten" },
  repair_intake_upload: { en: "Private repair media and case are created", de: "Private Reparaturmedien und Fall werden erstellt" },
  safety_stop: { en: "Danger scenarios stop dispatch and show safety guidance", de: "Gefahrenszenarien stoppen die Vermittlung und zeigen Sicherheitshinweise" },
  ai_guidance: { en: "AI guidance is qualified and costs are indicative", de: "KI-Hinweise sind eingeschränkt und Kosten unverbindlich" },
  max_four_postcode_only: { en: "At most four eligible traders see postcode-sector details", de: "Höchstens vier berechtigte Händler sehen den Postleitzahlbereich" },
  trader_offer: { en: "Subscribed invited trader submits a complete offer", de: "Eingeladener abonnierter Händler gibt ein vollständiges Angebot ab" },
  single_award_address_release: { en: "One trader is awarded and alone receives the address", de: "Ein Händler erhält den Auftrag und allein die Adresse" },
  five_completed_jobs: { en: "Five pilot jobs complete end to end", de: "Fünf Pilotaufträge werden vollständig abgeschlossen" },
  completion_evidence: { en: "Completion evidence and certificates persist", de: "Abschlussnachweise und Zertifikate bleiben erhalten" },
  dokuvera_safe_media: { en: "Dokuvera receives only safe redacted media", de: "Dokuvera erhält nur sichere, geschwärzte Medien" },
  integration_delivery_recovery: { en: "Gabley/Immoviq delivery and retry are idempotent", de: "Gabley-/Immoviq-Übertragung und Wiederholung sind idempotent" },
  subscription_removal: { en: "Unpaid traders lose search and lead eligibility", de: "Nicht zahlende Händler verlieren Such- und Anfrageberechtigung" },
  deletion_request: { en: "Account deletion works with an audit trail", de: "Kontolöschung funktioniert mit Prüfprotokoll" },
};

export function pilotProgress(checks: PilotCheckLike[]) {
  const required = checks.filter((check) => check.required);
  const passed = required.filter((check) => check.status === "pass").length;
  const failed = required.filter((check) => check.status === "fail").length;
  const blocked = required.filter((check) => check.status === "blocked").length;
  return {
    total: required.length,
    passed,
    failed,
    blocked,
    percent: required.length ? Math.round((passed / required.length) * 100) : 0,
    canSignOff: required.length > 0 && passed === required.length,
  };
}
