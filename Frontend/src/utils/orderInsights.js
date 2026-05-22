/** Client-side order stats (shared by Order History banner + insights dialog). */
export function computeInsights(orders) {
  const list = Array.isArray(orders) ? orders : [];
  const total = list.length;
  const validForSpend = list.filter((o) => o.status !== "cancelled");
  const totalSpent = validForSpend.reduce((s, o) => s + Number(o.total || 0), 0);
  const itemsPurchased = validForSpend.reduce(
    (s, o) => s + (o.items || []).reduce((ss, it) => ss + Number(it.quantity || 0), 0),
    0
  );
  const avgOrder = validForSpend.length ? totalSpent / validForSpend.length : 0;

  const byStatus = list.reduce((acc, o) => {
    const key = o.status || "processing";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const productCounts = new Map();
  for (const order of validForSpend) {
    for (const item of order.items || []) {
      const key = item.title || item.productId;
      if (!key) continue;
      const prior = productCounts.get(key) || { title: key, qty: 0, total: 0 };
      prior.qty += Number(item.quantity || 0);
      prior.total += Number(item.lineTotal || 0);
      productCounts.set(key, prior);
    }
  }
  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.qty - a.qty || b.total - a.total)
    .slice(0, 5);

  const sortedByDate = [...list].sort(
    (a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
  );

  return {
    total,
    totalSpent,
    itemsPurchased,
    avgOrder,
    byStatus,
    topProducts,
    firstOrder: sortedByDate[0] || null,
    lastOrder: sortedByDate[sortedByDate.length - 1] || null,
  };
}
