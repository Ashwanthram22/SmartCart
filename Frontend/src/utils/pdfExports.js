import { formatMoney } from "./money";
import { downloadPdfDefinition } from "./pdfmake";

function formatDate(iso) {
  const ts = Date.parse(iso);
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function orderAmounts(order) {
  const nested = order?.totals || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const fromLines = items.reduce((sum, it) => {
    if (it.lineTotal != null) return sum + Number(it.lineTotal);
    const qty = Number(it.quantity || 1);
    const price = Number(it.unitPrice ?? it.priceAtPurchase ?? it.price ?? 0);
    return sum + price * qty;
  }, 0);
  return {
    subtotal: Number(order?.subtotal ?? nested.subtotal ?? fromLines),
    discount: Number(order?.discount ?? nested.discount ?? 0),
    tax: Number(order?.tax ?? nested.tax ?? 0),
    shipping: Number(nested.shipping ?? 0),
    total: Number(order?.total ?? nested.total ?? nested.grandTotal ?? fromLines),
  };
}

function baseDoc(title, subtitle, tableBody, widths) {
  return {
    pageSize: "A4",
    pageMargins: [28, 32, 28, 32],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#141b2b" },
    content: [
      { text: "SmartCart", fontSize: 20, bold: true, color: "#6b38d4" },
      { text: title, fontSize: 14, bold: true, margin: [0, 8, 0, 2] },
      { text: subtitle, color: "#64748b", margin: [0, 0, 0, 12] },
      {
        table: { headerRows: 1, widths, body: tableBody },
        layout: {
          hLineWidth: (i) => (i === 1 ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => "#e2e8f0",
          fillColor: (rowIndex) => (rowIndex === 0 ? "#f8fafc" : null),
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
    ],
  };
}

export async function downloadProductsPdf(rows) {
  const body = [
    [
      { text: "ID", bold: true, color: "#64748b" },
      { text: "Product", bold: true, color: "#64748b" },
      { text: "Category", bold: true, color: "#64748b" },
      { text: "Brand", bold: true, color: "#64748b" },
      { text: "Price", bold: true, color: "#64748b", alignment: "right" },
      { text: "Stock", bold: true, color: "#64748b", alignment: "right" },
    ],
    ...rows.map((p) => [
      String(p.id || "—"),
      String(p.title || "—"),
      String(p.category || "—"),
      String(p.brand || "—"),
      { text: formatMoney(p.price), alignment: "right" },
      { text: String(Number(p.stock || 0)), alignment: "right" },
    ]),
  ];
  const stamp = new Date().toLocaleString();
  const doc = baseDoc(
    "Inventory Export",
    `Generated ${stamp} • ${rows.length} product${rows.length === 1 ? "" : "s"}`,
    body,
    [56, "*", 78, 70, 66, 40]
  );
  await downloadPdfDefinition(doc, `smartcart-products-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function downloadOrdersPdf(rows) {
  const body = [
    [
      { text: "Order", bold: true, color: "#64748b" },
      { text: "Placed", bold: true, color: "#64748b" },
      { text: "Customer", bold: true, color: "#64748b" },
      { text: "Status", bold: true, color: "#64748b" },
      { text: "Items", bold: true, color: "#64748b", alignment: "right" },
      { text: "Total", bold: true, color: "#64748b", alignment: "right" },
    ],
    ...rows.map((o) => [
      `#${o.id}`,
      formatDate(o.createdAt),
      String(o.userEmail || o.userId || "—"),
      String(o.status || "processing"),
      {
        text: String(
          Array.isArray(o.items)
            ? o.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
            : 0
        ),
        alignment: "right",
      },
      { text: formatMoney(orderAmounts(o).total), alignment: "right" },
    ]),
  ];
  const stamp = new Date().toLocaleString();
  const doc = baseDoc(
    "Orders Export",
    `Generated ${stamp} • ${rows.length} order${rows.length === 1 ? "" : "s"}`,
    body,
    [52, 114, "*", 64, 34, 70]
  );
  await downloadPdfDefinition(doc, `smartcart-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function downloadOrderReceiptPdf(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const amounts = orderAmounts(order);
  const itemBody = [
    [
      { text: "Item", bold: true, color: "#64748b" },
      { text: "Qty", bold: true, color: "#64748b", alignment: "right" },
      { text: "Price", bold: true, color: "#64748b", alignment: "right" },
      { text: "Total", bold: true, color: "#64748b", alignment: "right" },
    ],
    ...items.map((it) => {
      const qty = Number(it.quantity || 1);
      const unit = Number(it.unitPrice ?? it.priceAtPurchase ?? it.price ?? 0);
      return [
        String(it.title || it.productId || "Item"),
        { text: String(qty), alignment: "right" },
        { text: formatMoney(unit), alignment: "right" },
        { text: formatMoney(qty * unit), alignment: "right" },
      ];
    }),
  ];

  const doc = {
    pageSize: "A4",
    pageMargins: [34, 36, 34, 36],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#141b2b" },
    content: [
      { text: "SmartCart", fontSize: 20, bold: true, color: "#6b38d4" },
      { text: `Receipt #${order.id}`, margin: [0, 8, 0, 2], bold: true, fontSize: 14 },
      { text: `Placed ${formatDate(order.createdAt)} • Status: ${order.status || "processing"}`, color: "#64748b" },
      { text: " ", margin: [0, 8, 0, 0] },
      {
        table: { headerRows: 1, widths: ["*", 44, 72, 72], body: itemBody },
        layout: {
          hLineWidth: (i) => (i === 1 ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => "#e2e8f0",
          fillColor: (rowIndex) => (rowIndex === 0 ? "#f8fafc" : null),
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
      {
        margin: [0, 16, 0, 0],
        table: {
          widths: ["*", 140],
          body: [
            ["Subtotal", { text: formatMoney(amounts.subtotal), alignment: "right" }],
            ["Discount", { text: `-${formatMoney(amounts.discount || 0)}`, alignment: "right" }],
            ["Tax", { text: formatMoney(amounts.tax || 0), alignment: "right" }],
            ["Total", { text: formatMoney(amounts.total), alignment: "right", bold: true }],
          ],
        },
        layout: "noBorders",
      },
    ],
  };

  await downloadPdfDefinition(doc, `smartcart-receipt-${order.id}.pdf`);
}

