// ===============================
// PDF GENERATOR FUNCTION
// ===============================
function generatePdf(text, fileName) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 10, 10);
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  return file;
}

// ===============================
// LOGIN SYSTEM
// ===============================
const correctEmail = "aysharizan2011@gmail.com";
const correctPassword = "aysha1128";

document.getElementById("togglePassword").addEventListener("click", () => {
  const passField = document.getElementById("password");
  const type = passField.type === "password" ? "text" : "password";
  passField.type = type;
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (email === correctEmail && password === correctPassword) {
    localStorage.setItem("loggedIn", "true");
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
  } else {
    alert("❌ Incorrect Email or Password!");
  }
});

// --- LOGOUT BUTTON ---
const logoutBtn = document.createElement("button");
logoutBtn.id = "logoutBtn";
logoutBtn.textContent = "Logout";
document.body.appendChild(logoutBtn);

logoutBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("loggedIn");
    document.getElementById("loginScreen").style.display = "flex";
    logoutBtn.style.display = "none";
  }
});

// Check login state
if (localStorage.getItem("loggedIn") === "true") {
  const screen = document.getElementById("loginScreen");
  if (screen) screen.style.display = "none";
  logoutBtn.style.display = "inline-block";
}

// ===============================
// LEDGER APP CODE
// ===============================
const LS_PREFIX = 'ledger_v1_';
const form = document.getElementById('txnForm');
const txnsList = document.getElementById('txnsList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const monthSelect = document.getElementById('monthSelect');
const exportCsvBtn = document.getElementById('exportCsv');
const toggleFormBtn = document.getElementById('toggleForm');
const entryForm = document.getElementById('entryForm');
const resetFormBtn = document.getElementById('resetForm');

let editingId = null;

// ===============================
// HELPER FUNCTIONS
// ===============================
function formatCurrency(v) {
  return Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function keyForMonth(ym) { return LS_PREFIX + ym; }

function loadMonthKeyFromInput() {
  const val = monthSelect.value || new Date().toISOString().slice(0, 7);
  return keyForMonth(val);
}

function readTxns(ymKey) {
  const raw = localStorage.getItem(ymKey) || '[]';
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function writeTxns(ymKey, arr) {
  localStorage.setItem(ymKey, JSON.stringify(arr));
}

// ===============================
// RENDER FUNCTION
// ===============================
function render() {
  const ymKey = loadMonthKeyFromInput();
  const txns = readTxns(ymKey);
  txnsList.innerHTML = '';

  let totalIncome = 0, totalExpense = 0;
  if (txns.length === 0) {
    txnsList.innerHTML = '<div class="muted">No records found for this month.</div>';
  }

  txns.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
    const el = document.createElement('div'); el.className = `txn ${t.type}`;
    el.innerHTML = `
      <div class="meta">
        <div>
          <div class="tag">${t.category || ''}</div>
          <div style="font-size:12px;color:var(--muted)">${t.date} · ${t.note || ''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="amount">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</div>
        <div class="controls">
          <button data-action="edit" data-id="${t.id}" title="Edit">✎</button>
          <button data-action="delete" data-id="${t.id}" title="Delete">🗑</button>
        </div>
      </div>
    `;
    txnsList.appendChild(el);
    if (t.type === 'income') totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);
  });

  totalIncomeEl.textContent = formatCurrency(totalIncome);
  totalExpenseEl.textContent = formatCurrency(totalExpense);
  balanceEl.textContent = formatCurrency(totalIncome - totalExpense);
}

monthSelect.value = new Date().toISOString().slice(0, 7);

// ===============================
// ADD / EDIT / DELETE TRANSACTIONS
// ===============================
form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  if (!data.date || !data.amount || !data.type) return;

  const ym = data.date.slice(0, 7);
  const key = keyForMonth(ym);
  const txns = readTxns(key);

  if (editingId) {
    const idx = txns.findIndex(t => t.id === editingId);
    if (idx >= 0) {
      txns[idx] = { ...txns[idx], ...data, amount: Number(data.amount) };
    }
    editingId = null;
  } else {
    txns.push({
      id: 'id_' + Date.now(),
      date: data.date,
      type: data.type,
      category: data.category || '',
      note: data.note || '',
      amount: Number(data.amount)
    });
  }

  writeTxns(key, txns);
  form.reset();
  monthSelect.value = ym;
  render();
});

resetFormBtn.addEventListener('click', () => { form.reset(); editingId = null; });

txnsList.addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const action = btn.dataset.action; const id = btn.dataset.id;
  const ymKey = loadMonthKeyFromInput();
  const txns = readTxns(ymKey);
  if (action === 'delete') {
    const filtered = txns.filter(t => t.id !== id);
    writeTxns(ymKey, filtered);
    render();
  } else if (action === 'edit') {
    const t = txns.find(x => x.id === id); if (!t) return;
    document.getElementById('date').value = t.date;
    document.getElementById('type').value = t.type;
    document.getElementById('amount').value = t.amount;
    document.getElementById('category').value = t.category;
    document.getElementById('note').value = t.note;
    editingId = id;
    toggleForm(true);
  }
});

monthSelect.addEventListener('change', render);

// ======== EXPORT / SHARE PDF (fixed: no BIN) ========
exportCsvBtn.addEventListener("click", async () => {
  try {
    // get transactions for selected month
    const key = loadMonthKeyFromInput();
    const txns = readTxns(key);
    if (!txns.length) {
      alert('அந்த மாதத்தில் பதிவு இல்லை');
      return;
    }

    // prepare text lines
    const reportTitle = `${monthSelect.value} - Income & Expense Report`;
    let lines = [];
    let totalIncome = 0, totalExpense = 0;

    txns.slice().sort((a,b)=> new Date(a.date) - new Date(b.date)).forEach((t, i) => {
      lines.push(`${i + 1}. ${t.date} | ${t.type.toUpperCase()} | ${t.category || '-'} | ${t.amount} | ${t.note || ''}`);
      if (t.type === 'income') totalIncome += Number(t.amount);
      else totalExpense += Number(t.amount);
    });

    lines.push('');
    lines.push(`Total Income: ${totalIncome}`);
    lines.push(`Total Expense: ${totalExpense}`);
    lines.push(`Balance: ${totalIncome - totalExpense}`);

    const finalText = lines.join('\n').trimStart();

    // create PDF with jsPDF
    const { jsPDF } = window.jspdf; // make sure jspdf is loaded in HTML
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // Title (bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(reportTitle, 10, 15);

    // Body (normal)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    // put body starting a bit lower to avoid overlap
    doc.text(finalText, 10, 25, { maxWidth: 190, align: 'left' });

    // Export as Blob (PDF) — correct MIME
    const pdfBlob = doc.output("blob"); // Blob type: application/pdf
    const fileName = `Report-${monthSelect.value}.pdf`;
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });

    // Try native share with files (mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: reportTitle,
          text: `Report for ${monthSelect.value}`,
          files: [file]
        });
        return;
      } catch (err) {
        console.warn("Share failed or cancelled:", err);
        // continue to fallback download
      }
    }

    // Fallback: download the PDF (works everywhere)
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    alert("PDF downloaded (your device/browser may not support direct file sharing).");

  } catch (err) {
    console.error("Export/Share error:", err);
    alert("பிழை: PDF உருவாக்கம் அல்லது பகிர்தல் தோல்வியடைந்தது.");
  }
});
