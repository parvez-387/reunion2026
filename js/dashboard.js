// ---------------------------
// Helper Functions
// ---------------------------
function getCurrentTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}


// At the top of dashboard.js
const SUPABASE_URL = "https://mmsfhjfjrjqyldkyfvgn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tc2ZoamZqcmpxeWxka3lmdmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Njg3NjUsImV4cCI6MjA3OTI0NDc2NX0.9QseOdGWaLLjCktb7wE6GAMQsdklOXK3A4seW6UqD3U";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');

const searchInput = document.getElementById('searchInput');
const registrationsTable = document.querySelector('#registrationsTable tbody');

const totalRegistered = document.getElementById('totalRegistered');
const totalGuests = document.getElementById('totalGuests');
const totalAttended = document.getElementById('totalAttended');
const totalInvited = document.getElementById('totalInvited');

// Edit Modal
const editModal = document.getElementById('editModal');
const closeBtn = document.querySelector('.closeBtn');
const editForm = document.getElementById('editForm');

let registrations = [];

// Login
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .limit(1);

  if (data && data.length > 0) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    fetchRegistrations();
  } else {
    loginError.textContent = 'Invalid username or password';
  }
});

// Fetch registrations
async function fetchRegistrations() {
  const { data, error } = await supabase.from('registrations').select('*');
  if (error) {
    console.error(error);
    return;
  }
  registrations = data;
  renderTable(registrations);
  updateCards();
}

// Render table
function renderTable(data) {
  registrationsTable.innerHTML = '';
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.quantaa_id}</td>
      <td>${r.quantaa_name}</td>
      <td>${r.quantaa_phone}</td>
      <td>${r.batch_no}</td>
      <td>${r.tshirt_size}</td>
      <td>${r.num_guests || 0}</td>
      <td>${r.payment_method}</td>
      <td>${r.transaction_id}</td>
      <td>       
        <button class="actions-btn edit-btn btn" data-id="${r.id}">Edit</button>
        <button class="actions-btn change-status-btn btn" data-id="${r.id}">Change Status</button>
      </td>
    `;
    registrationsTable.appendChild(tr);
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
  });
}

// Update dashboard cards
function updateCards() {
  totalRegistered.textContent = registrations.length;
  totalGuests.textContent = registrations.reduce((sum, r) => sum + (r.num_guests || 0), 0);
  totalAttended.textContent = registrations.filter(r => r.status === 'Attended').length;
  totalInvited.textContent = registrations.length + totalGuests.textContent * 1;
}

// Search/filter
searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  const filtered = registrations.filter(r =>
    r.quantaa_name.toLowerCase().includes(term) ||
    r.quantaa_id.toLowerCase().includes(term) ||
    r.quantaa_phone.toLowerCase().includes(term)
  );
  renderTable(filtered);
});

// Open Edit Modal with data


// ---------------------------
// Open Edit Modal
// ---------------------------
function openEditModal(id) {
  const record = registrations.find(r => r.id == id);
  if (!record) return;

  editModal.classList.add('active');

  document.getElementById('quantaaID').value = record.quantaa_id || '';
  document.getElementById('batchNo').value = record.batch_no || '';
  document.getElementById('quantaaName').value = record.quantaa_name || '';
  document.getElementById('quantaaPhone').value = record.quantaa_phone || '';
  document.getElementById('fullAddress').value = record.full_address || '';
  document.getElementById('tshirtSize').value = record.tshirt_size || '';
  document.getElementById('numGuests').value = record.num_guests || 0;
  document.getElementById('feeAmount').value = record.fee_amount || '';
  document.getElementById('paymentMethod').value = record.payment_method || '';
  document.getElementById('transactionID').value = record.transaction_id || '';
  document.getElementById('suggestion').value = record.suggestion || '';

  // Store ID for saving
  registrationForm.dataset.editId = record.id;

  // Also store ID for deleting from modal
  document.getElementById("modalDeleteBtn").dataset.deleteId = record.id;
}

document.getElementById("modalDeleteBtn").addEventListener("click", function () {
  const id = this.dataset.deleteId;

  if (!id) return;

  if (confirm("Are you sure you want to delete this record?")) {
    deleteRecord(id);
    editModal.classList.remove('active');
  }
});




// ---------------------------
// Close modal
// ---------------------------
closeBtn.addEventListener('click', () => editModal.classList.remove('active'));

// ---------------------------
// Submit updated data
// ---------------------------
registrationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.submit-btn');
  const _origBtnText = btn.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const recordId = parseInt(form.dataset.editId, 10);
  if (!recordId) {
    showToast('No record ID found for update.', 'danger');
    if (btn) { btn.disabled = false; btn.textContent = _origBtnText; }
    return;
  }

  const payload = {
    quantaa_id: document.getElementById('quantaaID').value.trim(),
    batch_no: document.getElementById('batchNo').value.trim(),
    quantaa_name: document.getElementById('quantaaName').value.trim(),
    quantaa_phone: document.getElementById('quantaaPhone').value.trim(),
    full_address: document.getElementById('fullAddress').value.trim(),
    tshirt_size: document.getElementById('tshirtSize').value,
    bring_guest: document.getElementById('bringGuest')?.checked ? 'Yes' : 'No',
    num_guests: parseInt(document.getElementById('numGuests').value) || 0,
    guest_name: document.getElementById('guestName')?.value.trim() || null,
    fee_amount: parseFloat(document.getElementById('feeAmount').value) || null,
    payment_method: document.getElementById('paymentMethod').value,
    transaction_id: document.getElementById('transactionID').value.trim(),
    suggestion: document.getElementById('suggestion').value.trim(),
    updated_by: 'Dashboard', // or current user
    updated_on: getCurrentTimestamp(),
    status: 'Updated'
  };

  try {
    console.log('Updating record:', recordId, payload);
    const { data, error } = await supabase
      .from('registrations')
      .update(payload)
      .eq('id', recordId)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      showToast(`❌ Error updating record: ${error.message}`, 'danger');
    } else if (!data || data.length === 0) {
      showToast('⚠ No record updated. Check ID or payload.', 'danger');
    } else {
      console.log('Updated rows:', data);
      showToast('✔ Record updated successfully!', 'success');
      editModal.classList.remove('active');
      fetchRegistrations();
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Network error. Please try again.', 'danger');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = _origBtnText;
  }
});


// ---------------------------
// Delete record
// ---------------------------
async function deleteRecord(id) {
  const recordId = parseInt(id, 10);
 // if (!confirm(`Are you sure you want to delete record #${recordId}?`)) return;

  try {
    const { data, error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', recordId)
      .select();

    if (error) {
      console.error('Supabase delete error:', error);
      showToast(`❌ Error deleting record: ${error.message}`, 'danger');
    } else if (!data || data.length === 0) {
      showToast('⚠ No record deleted. Check ID.', 'danger');
    } else {
      console.log('Deleted rows:', data);
      showToast('✔ Record deleted successfully!', 'success');
      fetchRegistrations(); // refresh table
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Network error. Please try again.', 'danger');
  }
}

// ---------------------------
// Print
// ---------------------------
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

// ---------------------------
// Download Excel (CSV)
// ---------------------------
document.getElementById('downloadBtn').addEventListener('click', () => {
  if (registrations.length === 0) {
    showToast('⚠ No registrations to export.', 'danger');
    return;
  }

  const rows = registrations.map(r => ({
    QuantaaID: r.quantaa_id,
    Name: r.quantaa_name,
    Phone: r.quantaa_phone,
    Batch: r.batch_no,
    TShirt: r.tshirt_size,
    Guests: r.num_guests,
    Payment: r.payment_method,
    Transaction: r.transaction_id
  }));

  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map(r => Object.values(r).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'registrations.csv';
  a.click();
  URL.revokeObjectURL(url);

  showToast('✔ CSV downloaded successfully!', 'success');
});



