export const DEFAULT_GST_RATE = 18;

export type GstBreakdown = {
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
};

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateGst(baseAmount: number, gstRate = DEFAULT_GST_RATE): GstBreakdown {
  const normalizedBase = Number.isFinite(baseAmount) ? Math.max(0, baseAmount) : 0;
  const normalizedRate = Number.isFinite(gstRate) ? Math.max(0, gstRate) : DEFAULT_GST_RATE;
  const gstAmount = toMoney((normalizedBase * normalizedRate) / 100);

  return {
    baseAmount: toMoney(normalizedBase),
    gstRate: toMoney(normalizedRate),
    gstAmount,
    totalAmount: toMoney(normalizedBase + gstAmount),
  };
}
