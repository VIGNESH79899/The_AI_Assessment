export const defaultPlans = [
  {
    key: "monthly",
    name: "1 Month Membership",
    interval: "monthly",
    durationMonths: 1,
    priceInr: 799,
    features: ["Premium AI generator", "20 documents/month", "Invoice downloads", "Email support"]
  },
  {
    key: "quarterly",
    name: "3 Month Membership",
    interval: "quarterly",
    durationMonths: 3,
    priceInr: 1999,
    features: ["Everything in Monthly", "70 documents/quarter", "Referral rewards", "Priority generation"]
  },
  {
    key: "half-yearly",
    name: "6 Month Membership",
    interval: "half-yearly",
    durationMonths: 6,
    priceInr: 3499,
    popular: true,
    features: ["Everything in Quarterly", "180 documents/period", "Advanced analytics", "Priority support"]
  },
  {
    key: "yearly",
    name: "1 Year Membership",
    interval: "yearly",
    durationMonths: 12,
    priceInr: 5999,
    features: ["Everything in Half-Yearly", "Unlimited standard documents", "Admin exports", "Concierge onboarding"]
  }
];
