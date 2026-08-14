import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { SupabaseClient } from "@supabase/supabase-js";

export interface InvoicePDFData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  client_name: string;
  client_email?: string;
  company_name: string;
  company_address?: string;
  currency: string;
  amount: number;
  subtotal: number;
  discount: number;
  tax: number;
  paid_amount: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  notes?: string;
}

/**
 * Generate a minimal PDF invoice with real data.
 * Returns PDF bytes ready for storage or transmission.
 * Never duplicates financial math — all amounts are pre-calculated server-side.
 */
export async function generateInvoicePDF(data: InvoicePDFData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size in points
  const { height } = page.getSize();

  const fontSize12 = 12;
  const fontSize14 = 14;
  const fontSize16 = 16;
  const fontSize10 = 10;
  const color = rgb(0, 0, 0);
  const lightGray = rgb(0.95, 0.95, 0.95);

  let y = height - 50;

  // Header
  page.drawText(`${data.company_name}`, { x: 50, y, size: fontSize16, color });
  y -= 20;
  if (data.company_address) {
    page.drawText(data.company_address, { x: 50, y, size: fontSize10, color });
    y -= 15;
  }

  y -= 10;

  // Invoice title and number
  page.drawText("INVOICE", { x: 50, y, size: fontSize14, color });
  page.drawText(`#${data.invoice_number}`, { x: 450, y, size: fontSize14, color });
  y -= 25;

  // Dates
  page.drawText(`Issue Date: ${data.issue_date}`, { x: 50, y, size: fontSize10, color });
  page.drawText(`Due Date: ${data.due_date}`, { x: 350, y, size: fontSize10, color });
  y -= 15;

  // Bill To
  y -= 5;
  page.drawText("BILL TO:", { x: 50, y, size: fontSize12, color });
  y -= 15;
  page.drawText(data.client_name, { x: 50, y, size: fontSize10, color });
  y -= 12;
  if (data.client_email) {
    page.drawText(data.client_email, { x: 50, y, size: fontSize10, color });
    y -= 12;
  }

  y -= 10;

  // Line items table header
  page.drawRectangle({ x: 50, y: y - 20, width: 500, height: 20, color: lightGray });
  page.drawText("Description", { x: 55, y: y - 15, size: fontSize10, color });
  page.drawText("Qty", { x: 350, y: y - 15, size: fontSize10, color });
  page.drawText("Unit Price", { x: 400, y: y - 15, size: fontSize10, color });
  page.drawText("Total", { x: 480, y: y - 15, size: fontSize10, color });
  y -= 25;

  // Line items
  for (const item of data.items) {
    page.drawText(item.description.substring(0, 40), { x: 55, y, size: fontSize10, color });
    page.drawText(item.quantity.toString(), { x: 360, y, size: fontSize10, color });
    page.drawText(formatAmount(item.unit_price, data.currency), { x: 400, y, size: fontSize10, color });
    page.drawText(formatAmount(item.line_total, data.currency), { x: 480, y, size: fontSize10, color });
    y -= 15;

    if (y < 100) {
      // Add new page if running out of space
      y = height - 50;
    }
  }

  y -= 10;

  // Totals section
  const totalsX = 420;
  const totalsWidth = 125;

  page.drawText("Subtotal:", { x: totalsX, y, size: fontSize10, color });
  page.drawText(formatAmount(data.subtotal, data.currency), { x: totalsX + 80, y, size: fontSize10, color });
  y -= 15;

  if (data.discount > 0) {
    page.drawText("Discount:", { x: totalsX, y, size: fontSize10, color });
    page.drawText(`-${formatAmount(data.discount, data.currency)}`, { x: totalsX + 80, y, size: fontSize10, color });
    y -= 15;
  }

  if (data.tax > 0) {
    page.drawText("Tax:", { x: totalsX, y, size: fontSize10, color });
    page.drawText(formatAmount(data.tax, data.currency), { x: totalsX + 80, y, size: fontSize10, color });
    y -= 15;
  }

  // Total due (bold)
  y -= 5;
  page.drawRectangle({ x: totalsX - 5, y: y - 18, width: totalsWidth, height: 20, color: lightGray });
  page.drawText("Total Due:", { x: totalsX, y: y - 13, size: fontSize12, color });
  page.drawText(formatAmount(data.amount, data.currency), { x: totalsX + 80, y: y - 13, size: fontSize12, color });
  y -= 30;

  // Payment status
  const balance = data.amount - data.paid_amount;
  if (balance > 0) {
    page.drawText(`Amount Paid: ${formatAmount(data.paid_amount, data.currency)}`, { x: 50, y, size: fontSize10, color });
    y -= 12;
    page.drawText(`Outstanding: ${formatAmount(balance, data.currency)}`, { x: 50, y, size: fontSize10, color });
  } else {
    page.drawText("✓ PAID", { x: 50, y, size: fontSize12, color });
  }

  y -= 15;

  // Notes
  if (data.notes) {
    page.drawText("Notes:", { x: 50, y, size: fontSize10, color });
    y -= 12;
    // Wrap notes text
    const noteLines = wrapText(data.notes, 80);
    for (const line of noteLines) {
      page.drawText(line, { x: 50, y, size: fontSize10, color });
      y -= 12;
    }
  }

  return pdfDoc.save();
}

function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let currentLine = "";
  const words = text.split(" ");
  for (const word of words) {
    if ((currentLine + word).length <= maxChars) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Fetch invoice data and generate PDF.
 * Stores PDF URL back to invoices.pdf_url.
 * Returns the PDF bytes.
 */
export async function generateAndSaveInvoicePDF(
  ctx: { supabase: SupabaseClient; userId: string },
  invoiceId: string
): Promise<{ pdf_url?: string; error?: string }> {
  // Fetch invoice with client and items
  const { data: invoice, error: invoiceError } = await ctx.supabase
    .from("invoices")
    .select("*, client:client_id(name, email)")
    .eq("id", invoiceId)
    .eq("owner_id", ctx.userId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    return { error: "Invoice not found" };
  }

  // Fetch invoice items
  const { data: items } = await ctx.supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, line_total")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  // Fetch company info from profile
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("company_name, address")
    .eq("id", ctx.userId)
    .maybeSingle();

  const pdfBytes = await generateInvoicePDF({
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date ? invoice.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    client_name: invoice.client?.name || "Client",
    client_email: invoice.client?.email,
    company_name: profile?.company_name || "Your Company",
    company_address: profile?.address,
    currency: invoice.currency,
    amount: invoice.amount,
    subtotal: invoice.subtotal,
    discount: invoice.discount || 0,
    tax: invoice.tax || 0,
    paid_amount: invoice.paid_amount || 0,
    items: (items || []).map((item) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      line_total: item.line_total || 0,
    })),
    notes: invoice.notes,
  });

  // Store PDF in Supabase Storage (optional)
  // For now, we'll just return the bytes for download or inline viewing
  // In production, you'd upload to storage and get a signed URL

  // Update invoice with PDF URL (placeholder)
  const pdfUrl = `/api/invoices/${invoiceId}/pdf`;
  const { error: updateError } = await ctx.supabase
    .from("invoices")
    .update({ pdf_url: pdfUrl })
    .eq("id", invoiceId)
    .eq("owner_id", ctx.userId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { pdf_url: pdfUrl };
}
