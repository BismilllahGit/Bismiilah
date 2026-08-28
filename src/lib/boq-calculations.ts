export function computeBOQTotals(
  localSections: any[],
  cgstRate: string,
  sgstRate: string,
) {
  let grandTotal = 0;
  const computedSecs = localSections.map((sec) => {
    let subtotal = 0;
    const computedItems = sec.lineItems.map((li: any) => {
      let amount = Number(li.amount || 0);
      if (li.lineType === "CALCULATED") {
        amount = Number(li.quantity || 0) * Number(li.rate || 0);
      }
      subtotal += amount;
      return { ...li, computedAmount: amount };
    });
    grandTotal += subtotal;
    return { ...sec, computedSubtotal: subtotal, lineItems: computedItems };
  });

  const cgst = grandTotal * (Number(cgstRate || 0) / 100);
  const sgst = grandTotal * (Number(sgstRate || 0) / 100);
  const finalTotal = grandTotal + cgst + sgst;

  return {
    computedSections: computedSecs,
    totals: { grandTotal, cgst, sgst, finalTotal },
  };
}
