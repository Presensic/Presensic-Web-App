export function isTestCompany(c: any): boolean {
  if (!c) return false;
  if (c.is_test_account === true) return true;
  const name = String(c.org_name || c.company_name || c.name || "").toLowerCase().trim();
  const owner = String(c.full_name || c.owner_name || c.contact || "").toLowerCase().trim();
  const email = String(c.whatsapp || c.email || c.phone || "").toLowerCase().trim();

  // Test accounts include: DS Ventures, acrux, Test Co..., Test Company..., test, or any record with "test"
  if (
    name === "ds ventures" ||
    name === "acrux" ||
    name === "test" ||
    name.startsWith("test co") ||
    name.startsWith("test company") ||
    name.includes("test") ||
    owner.includes("test") ||
    email.includes("test")
  ) {
    return true;
  }
  return false;
}

export function getPlanMonthlyPrice(planName: string, billingCycle: string = "monthly", isTest: boolean = false): number {
  if (isTest) return 0;
  const p = (planName || "").toLowerCase();
  const isAnnual = (billingCycle || "").toLowerCase().includes("annual") || (billingCycle || "").toLowerCase().includes("year");

  if (p.includes("basic")) {
    return isAnnual ? 4999 / 12 : 599;
  }
  if (p.includes("starter") || p.includes("growth") || p.includes("pro")) {
    return isAnnual ? 12999 / 12 : 1499;
  }
  if (p.includes("enterprise")) {
    return 0; // Custom pricing - no fixed revenue number
  }
  return 0; // Free trial
}

export function getPlanDisplayPrice(planName: string, billingCycle: string = "monthly"): string {
  const p = (planName || "").toLowerCase();
  const isAnnual = (billingCycle || "").toLowerCase().includes("annual") || (billingCycle || "").toLowerCase().includes("year");

  if (p.includes("basic")) {
    return isAnnual ? "₹4,999/yr (₹417/mo)" : "₹599/mo";
  }
  if (p.includes("starter") || p.includes("growth") || p.includes("pro")) {
    return isAnnual ? "₹12,999/yr (₹1,083/mo)" : "₹1,499/mo";
  }
  if (p.includes("enterprise")) {
    return "Custom Pricing";
  }
  return "Free Trial (5 Days)";
}

export function normalizePlanName(planName: string): "Trial" | "Basic" | "Starter" | "Enterprise" {
  const p = (planName || "").toLowerCase();
  if (p.includes("enterprise")) return "Enterprise";
  if (p.includes("basic")) return "Basic";
  if (p.includes("starter") || p.includes("growth") || p.includes("pro")) return "Starter";
  return "Trial";
}
