import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Formats a number to Rupiah using commas as thousands separators to match the physical slip format exactly.
 * E.g., 150000 -> Rp 150,000
 */
export const formatCurrency = (n: number | null | undefined): string => {
  if (n == null) return "Rp -";
  return "Rp " + n.toLocaleString("en-US");
};

/**
 * Fetches all necessary payslip data and opens a popup print window.
 * Unifies the printing layout and logic for both the coach and owner panels.
 */
export async function printPayslip(supabase: SupabaseClient, payslipId: string): Promise<void> {
  const w = window.open("", "_blank", "width=700,height=900");
  if (!w) return;

  // Show a premium loading spinner inside the popup while loading data
  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading Salary Slip...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f8fafc;
          color: #64748b;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #155689;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .text {
          font-size: 14px;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <div class="text">Memuat data slip gaji...</div>
    </body>
    </html>
  `);
  w.document.close();

  try {
    // 1. Fetch the payslip record along with coach and branch relation snapshots
    const { data: payslip, error: payslipError } = await supabase
      .from("payslips")
      .select(`
        id,
        period_label,
        gross_amount,
        deductions,
        net_amount,
        notes,
        status,
        published_at,
        coach_id,
        invoice_id,
        coach:profiles!payslips_coach_id_fkey(id, full_name, email, bank_name, bank_account, bank_holder),
        branch:branches(id, name)
      `)
      .eq("id", payslipId)
      .single();

    if (payslipError || !payslip) {
      throw new Error(payslipError?.message || "Payslip not found");
    }

    const coach = payslip.coach as any;

    // 2. Fetch invoice items (if generated from an invoice)
    let invoiceItems: any[] = [];
    if (payslip.invoice_id) {
      const { data } = await supabase
        .from("coach_invoice_items")
        .select(`
          id,
          item_type,
          class_id,
          session_count,
          rate,
          subtotal,
          description,
          class:classes(id, name, branch_id, branch:branches(name))
        `)
        .eq("invoice_id", payslip.invoice_id);
      if (data) invoiceItems = data;
    }

    // 3. Fetch all classes currently assigned to this coach
    const { data: coachClasses } = await supabase
      .from("class_coaches")
      .select(`
        class_id,
        class:classes(id, name, class_type, branch_id, branch:branches(name))
      `)
      .eq("coach_id", payslip.coach_id);

    // 4. Fetch rates for all classes (to show the rates for 0-session classes)
    const { data: coachRates } = await supabase
      .from("coach_rates")
      .select("class_id, coach_id, rate_per_session")
      .or(`coach_id.eq.${payslip.coach_id},coach_id.is.null`);

    // 5. Merge data to build a complete list of classes
    interface ClassRowDetail {
      id: string;
      name: string;
      branchName: string;
      qty: number | null; // null represents '-'
      rate: number | null;
      payment: number | null;
    }
    const classMap = new Map<string, ClassRowDetail>();

    // Seed with currently assigned classes (with qty 0/'-' by default)
    if (coachClasses) {
      coachClasses.forEach((cc: any) => {
        if (!cc.class) return;
        const c = cc.class;
        
        // Resolve rate: custom rate overrides general rate
        const specificRate = coachRates?.find((r: any) => r.class_id === c.id && r.coach_id === payslip.coach_id);
        const generalRate = coachRates?.find((r: any) => r.class_id === c.id && !r.coach_id);
        const rateVal = specificRate?.rate_per_session ?? generalRate?.rate_per_session ?? null;

        classMap.set(c.id, {
          id: c.id,
          name: c.name,
          branchName: c.branch?.name ?? (payslip.branch as any)?.name ?? "OTHER BRANCH",
          qty: null,
          rate: rateVal,
          payment: null,
        });
      });
    }

    // Overlay or add classes from actual invoice items
    invoiceItems.forEach((item: any) => {
      if (item.item_type && item.item_type !== "class") {
        // Extra/Reimburse: keyed by item.id, never collides, never overwrites classMap entries seeded from class_coaches
        classMap.set(`item-${item.id}`, {
          id: item.id,
          name: item.item_type === "extra" ? "Sesi Extra" : `Reimburse — ${item.description ?? ""}`,
          branchName: (payslip.branch as any)?.name ?? "OTHER BRANCH",
          qty: item.session_count,
          rate: item.rate,
          payment: item.subtotal,
        });
        return;
      }
      const c = item.class;
      const classId = item.class_id;
      const branchName = c?.branch?.name ?? (payslip.branch as any)?.name ?? "OTHER BRANCH";
      const className = c?.name ?? classId;

      classMap.set(classId, {
        id: classId,
        name: className,
        branchName: branchName,
        qty: item.session_count,
        rate: item.rate,
        payment: item.subtotal,
      });
    });

    // 6. Group classes by Branch Name
    const branchesMap = new Map<string, ClassRowDetail[]>();
    classMap.forEach((details) => {
      const list = branchesMap.get(details.branchName) ?? [];
      list.push(details);
      branchesMap.set(details.branchName, list);
    });

    // Sort branch names alphabetically for clean output
    const sortedBranches = Array.from(branchesMap.keys()).sort();

    // 7. Fetch real deduction breakdown; fall back to the legacy 2%-cap split for payslips predating this feature
    const grossAmount = payslip.gross_amount ?? 0;
    const totalDeductions = payslip.deductions ?? 0;

    const { data: deductionRows } = await supabase
      .from("payslip_deductions")
      .select("label, amount")
      .eq("payslip_id", payslipId)
      .order("type");

    const totalsRowsHtml = (deductionRows && deductionRows.length > 0)
      ? deductionRows.map((d: { label: string; amount: number }) => `
          <tr>
            <td class="label-col">${d.label}</td>
            <td class="val-col">${formatCurrency(d.amount)}</td>
          </tr>
        `).join("")
      : (() => {
          const tax = totalDeductions >= grossAmount * 0.02 ? Math.round(grossAmount * 0.02) : totalDeductions;
          const loanDeduction = totalDeductions - tax;
          return `
            <tr>
              <td class="label-col">Tax</td>
              <td class="val-col">${formatCurrency(tax)}</td>
            </tr>
            <tr>
              <td class="label-col">Loan Deduction</td>
              <td class="val-col">${formatCurrency(loanDeduction)}</td>
            </tr>
          `;
        })();

    // 8. Generate print-ready HTML
    const origin = window.location.origin;
    const logoUrl = `${origin}/logo_next_persegipanjang.png`;

    const tableRowsHtml = sortedBranches.map((branchName) => {
      const classes = branchesMap.get(branchName) ?? [];
      
      const branchHeader = `
        <tr class="branch-row">
          <td colspan="4">${branchName}</td>
        </tr>
      `;

      const classRows = classes.map((cls) => {
        const qtyDisplay = cls.qty != null ? cls.qty.toString() : "-";
        const rateDisplay = cls.rate != null ? formatCurrency(cls.rate) : "Rp -";
        const paymentDisplay = cls.payment != null ? formatCurrency(cls.payment) : "";

        return `
          <tr class="class-row">
            <td class="desc-cell">${cls.name}</td>
            <td class="qty-cell">${qtyDisplay}</td>
            <td class="rate-cell">${rateDisplay}</td>
            <td class="payment-cell">${paymentDisplay}</td>
          </tr>
        `;
      }).join("");

      return branchHeader + classRows;
    }).join("");

    const documentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Salary Slip — ${payslip.period_label}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .page {
            width: 595px; /* A4 width */
            margin: 0 auto;
            padding: 40px 48px;
            background: #fff;
          }
          
          .logo-container {
            text-align: center;
            margin-bottom: 12px;
          }
          
          .logo-container img {
            height: 85px;
            width: auto;
            object-fit: contain;
          }
          
          .slip-title {
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          .slip-period {
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          
          .header-line {
            border-bottom: 2.5px solid #000;
            margin-bottom: 16px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 85px 10px 1fr;
            row-gap: 4px;
            font-size: 12.5px;
            font-weight: 700;
            color: #000;
            margin-bottom: 20px;
          }
          
          .info-label {
            text-transform: uppercase;
          }
          
          .info-value {
            font-weight: 500;
            text-transform: uppercase;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            color: #000;
          }
          
          th {
            font-weight: 700;
            text-transform: uppercase;
            padding: 5px 0;
            border-top: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
          }
          
          .branch-row td {
            font-weight: 700;
            text-transform: uppercase;
            padding-top: 10px;
            padding-bottom: 4px;
            font-size: 12.5px;
          }
          
          .class-row td {
            padding: 3px 0;
            font-weight: 500;
            text-transform: uppercase;
          }
          
          .desc-cell {
            text-align: left;
            padding-left: 2px;
          }
          
          .qty-cell {
            text-align: center;
            width: 50px;
          }
          
          .rate-cell {
            text-align: right;
            width: 110px;
            padding-right: 20px;
            font-variant-numeric: tabular-nums;
          }
          
          .payment-cell {
            text-align: right;
            width: 120px;
            font-variant-numeric: tabular-nums;
          }
          
          .totals-wrapper {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }
          
          .totals-table {
            width: 300px;
            border-collapse: collapse;
            font-size: 12px;
            color: #000;
          }
          
          .totals-table td {
            padding: 4px 0;
            font-weight: 700;
            text-transform: uppercase;
          }
          
          .totals-table .label-col {
            text-align: left;
          }
          
          .totals-table .val-col {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          
          .border-top {
            border-top: 1px solid #000;
          }
          
          .double-border-top {
            border-top: 1.5px solid #000;
            margin-top: 2px;
          }
          
          .take-home-pay-row td {
            font-size: 13px;
            font-weight: 800;
            padding-top: 6px;
            padding-bottom: 6px;
          }
          
          .transfer-section {
            margin-top: 28px;
            font-size: 12px;
            color: #000;
            line-height: 1.4;
          }
          
          .transfer-title {
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .transfer-grid {
            display: grid;
            grid-template-columns: 85px 10px 1fr;
            row-gap: 3px;
            font-weight: 700;
          }
          
          .transfer-value {
            font-weight: 500;
          }
          
          .transfer-email {
            font-weight: 500;
          }
          
          .notes-section {
            margin-top: 24px;
            border-top: 1px dashed #ccc;
            padding-top: 12px;
            font-size: 11px;
            color: #475569;
          }
          
          .notes-title {
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          @media print {
            body {
              background: #fff;
            }
            .page {
              margin: 0;
              padding: 40px 48px;
              width: 100%;
            }
            @page {
              margin: 0;
              size: A4 portrait;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Logo Header -->
          <div class="logo-container">
            <img src="${logoUrl}" alt="NEXT Swimming School" onerror="this.style.display='none'" />
          </div>
          
          <!-- Title -->
          <div class="slip-title">Salary Slip</div>
          <div class="slip-period">${payslip.period_label}</div>
          
          <div class="header-line"></div>
          
          <!-- Info Details -->
          <div class="info-grid">
            <div class="info-label">Name</div>
            <div>:</div>
            <div class="info-value">${coach?.full_name ?? "—"}</div>
            
            <div class="info-label">Position</div>
            <div>:</div>
            <div class="info-value">Coach</div>
          </div>
          
          <!-- Classes and Session Details Table -->
          <table>
            <thead>
              <tr>
                <th class="desc-cell">Description</th>
                <th class="qty-cell">Qty</th>
                <th class="rate-cell">Rate</th>
                <th class="payment-cell">Payment</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          
          <!-- Totals Section -->
          <div class="totals-wrapper">
            <table class="totals-table">
              <tr>
                <td class="label-col border-top">Total Payment</td>
                <td class="val-col border-top">${formatCurrency(grossAmount)}</td>
              </tr>
              ${totalsRowsHtml}
              <tr class="take-home-pay-row">
                <td class="label-col border-top">Take Home Pay</td>
                <td class="val-col border-top">${formatCurrency(payslip.net_amount)}</td>
              </tr>
            </table>
          </div>
          
          <!-- Transfer Information -->
          <div class="transfer-section">
            <div class="transfer-title">Transferred to,</div>
            <div class="transfer-grid">
              <div>Email</div>
              <div>:</div>
              <div class="transfer-email">${coach?.email ?? "—"}</div>
              
              <div>Bank</div>
              <div>:</div>
              <div class="transfer-value">${coach?.bank_name ?? "—"}</div>
              
              <div>Number</div>
              <div>:</div>
              <div class="transfer-value">${coach?.bank_account ?? "—"}</div>
              
              <div>Name</div>
              <div>:</div>
              <div class="transfer-value">${coach?.bank_holder ?? "—"}</div>
            </div>
          </div>

          <!-- Notes (if any) -->
          ${payslip.notes ? `
            <div class="notes-section">
              <div class="notes-title">Catatan</div>
              <div>${payslip.notes}</div>
            </div>
          ` : ""}
        </div>
      </body>
      </html>
    `;

    // 9. Write HTML, focus, and trigger print dialog
    w.document.open();
    w.document.write(documentHtml);
    w.document.close();
    w.focus();
    
    // Slight timeout to let fonts and resources render before printing
    setTimeout(() => {
      w.print();
    }, 250);

  } catch (err: any) {
    w.document.open();
    w.document.write(`
      <div style="font-family: sans-serif; padding: 32px; text-align: center; color: #dc2626;">
        <h3 style="margin-bottom: 8px;">Gagal Memuat Slip Gaji</h3>
        <p style="font-size: 13px; color: #4b5563;">${err?.message || err || "Terjadi kesalahan tidak dikenal."}</p>
        <button onclick="window.close()" style="margin-top: 16px; padding: 6px 12px; font-size: 12px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer;">Tutup</button>
      </div>
    `);
    w.document.close();
  }
}
