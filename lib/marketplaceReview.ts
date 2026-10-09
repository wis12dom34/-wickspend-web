export function reviewedMarketplaceDelivery(text: string, quantity: unknown) {
  const expected = Number(quantity);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!Number.isSafeInteger(expected) || expected < 1 || lines.length !== expected) {
    throw new Error("Enter one delivery line for each item in the original order.");
  }
  return lines.map(details => ({ product_detail_id: "", details }));
}
