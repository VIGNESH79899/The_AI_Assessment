export const defaultPlans = [
  {
    key: "quarterly",
    name: "3-Month Premium Plan",
    interval: "quarterly",
    durationMonths: 3,
    priceInr: 399,
    features: ["Unlimited document generation", "Premium AI generator", "Invoice downloads", "Referral rewards", "Priority generation"]
  },
  {
    key: "half-yearly",
    name: "6-Month Value Plan",
    interval: "half-yearly",
    durationMonths: 6,
    priceInr: 799,
    popular: true,
    features: ["Unlimited document generation", "Premium AI generator", "Advanced analytics", "Priority support", "Invoice downloads"]
  },
  {
    key: "yearly",
    name: "1-Year Ultimate Plan",
    interval: "yearly",
    durationMonths: 12,
    priceInr: 1399,
    features: ["Unlimited document generation", "Premium AI generator", "Admin exports", "Concierge onboarding", "Priority support"]
  }
];
