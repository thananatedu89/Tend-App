const thb = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "THB",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function formatThb(amount: number) {
  return thb.format(amount).replace("THB", "฿").replace("$", "฿");
}
