export const PERFORMANCE_TOOLTIPS = {
  gciYtd: {
    content: "Gross Commission Income Year-to-Date. Total commission earned from closed deals since January 1st of this year.",
    source: "ReZen transactions"
  },
  gciL12m: {
    content: "Gross Commission Income Last 12 Months. Total commission earned from deals closed in the past 12 months (rolling).",
    source: "ReZen transactions"
  },
  pendingGci: {
    content: "Pending Gross Commission Income. Expected commission from deals currently under contract but not yet closed.",
    source: "ReZen open/pending transactions"
  },
  avgPerDeal: {
    content: "Average Commission per Deal. Your GCI YTD divided by total closed deals this year.",
    source: "Calculated from ReZen transactions"
  },
  buyerSideYtd: {
    content: "Deals where you represented the buyer, closed this year. Volume is total sale price of these transactions.",
    source: "ReZen transactions (listing=false)"
  },
  buyerSideL12m: {
    content: "Deals where you represented the buyer, closed in the last 12 months. Volume is total sale price of these transactions.",
    source: "ReZen transactions (listing=false)"
  },
  sellerSideYtd: {
    content: "Listing deals where you represented the seller, closed this year. Volume is total sale price of these transactions.",
    source: "ReZen transactions (listing=true)"
  },
  sellerSideL12m: {
    content: "Listing deals where you represented the seller, closed in the last 12 months. Volume is total sale price of these transactions.",
    source: "ReZen transactions (listing=true)"
  },
  avgSalePrice: {
    content: "Average sale price of all your closed deals in the last 12 months.",
    source: "ReZen closed transactions (L12M)"
  },
  avgDaysToClose: {
    content: "Average number of days from contract date to closing for deals in the last 12 months. Calculated from contract date (firmDate) to close date (closedAt).",
    source: "ReZen closed transactions (L12M)"
  },
  yearOverYear: {
    content: "Compares your GCI from this point last year to the same point this year. Shows your growth or decline percentage.",
    source: "ReZen transactions comparison"
  }
};
