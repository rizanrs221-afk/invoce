
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

  // If already logged in
  if (localStorage.getItem("loggedIn") === "true") {
    const screen = document.getElementById("loginScreen");
    if (screen) screen.style.display = "none";
    logoutBtn.style.display = "inline-block";
  }

  // ===============================
  // EXISTING LEDGER APP CODE BELOW
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

  function render() {
    const ymKey = loadMonthKeyFromInput();
    const txns = readTxns(ymKey);
    txnsList.innerHTML = '';

    let totalIncome = 0, totalExpense = 0;
    if (txns.length === 0) {
      txnsList.innerHTML = '<div class="muted">இவ்வலகத்தின் பதிவுகள் இல்லை</div>';
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


exportCsvBtn.addEventListener('click', async () => {
  const key = loadMonthKeyFromInput();
  const txns = readTxns(key);

  if (!txns.length) {
    alert('அந்த மாதத்தில் பதிவு இல்லை');
    return;
  }

  // Prepare CSV content
  const rows = ['id,date,type,category,amount,note'];
  txns.forEach(t =>
    rows.push([
      t.id,
      t.date,
      t.type,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ].join(','))
  );
  const csv = rows.join('\n');

  // Create Blob file
  const blob = new Blob([csv], { type: 'text/csv' });
  const fileName = `${monthSelect.value || new Date().toISOString().slice(0, 7)}_ledger.csv`;
  const file = new File([blob], fileName, { type: 'text/csv' });

  // Try Web Share API (works on most mobile browsers)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Ledger Report',
        text: `${monthSelect.value} மாதத்தின் வரவு-செலவு விவரம்.`,
        files: [file],
      });
    } catch (err) {
      console.warn('User canceled sharing:', err);
    }
  } else {
    // Fallback to normal download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    alert('Your browser does not support direct sharing. CSV downloaded instead.');
  }
});
