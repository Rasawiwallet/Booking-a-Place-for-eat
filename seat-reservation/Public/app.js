// Simple seat layout generator and booking logic
// Layout: two rows A and B, 5 columns (A1..A5, B1..B5)
// You can extend layout as needed.

const seatContainer = document.getElementById('seat-container');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');
const outletSelect = document.getElementById('outlet');
const loadBtn = document.getElementById('load');
const pickedSpan = document.getElementById('picked');
const bookingForm = document.getElementById('booking-form');
const messageDiv = document.getElementById('message');

const rows = ['A','B'];
const cols = [1,2,3,4,5];

let selectedSeats = new Set();
let reservedSeats = [];

// initialize date default to today
function formatDate(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
dateInput.value = formatDate(new Date());

function renderSeats() {
  seatContainer.innerHTML = '';
  for (const r of rows) {
    for (const c of cols) {
      const id = r + c;
      const seatEl = document.createElement('div');
      seatEl.className = 'seat';
      seatEl.textContent = id;

      if (reservedSeats.includes(id)) {
        seatEl.classList.add('reserved');
      } else {
        seatEl.classList.add('available');
        seatEl.addEventListener('click', () => {
          if (selectedSeats.has(id)) {
            selectedSeats.delete(id);
            seatEl.classList.remove('selected');
          } else {
            selectedSeats.add(id);
            seatEl.classList.add('selected');
          }
          updatePickedText();
        });
      }
      seatContainer.appendChild(seatEl);
    }
  }
  updatePickedText();
}

function updatePickedText(){
  pickedSpan.textContent = selectedSeats.size ? Array.from(selectedSeats).join(', ') : '-';
}

async function loadReserved() {
  const date = dateInput.value;
  const outlet = outletSelect.value;
  if (!date || !outlet) return alert('Pilih tanggal dan outlet terlebih dahulu.');
  messageDiv.textContent = 'Memuat kursi...';
  try {
    const res = await fetch(`/api/reserved?date=${encodeURIComponent(date)}&outlet=${encodeURIComponent(outlet)}`);
    if (!res.ok) throw new Error('Gagal memuat');
    const data = await res.json();
    reservedSeats = data.reserved || [];
    // Clear selected seats not available anymore
    selectedSeats.forEach(s => { if (reservedSeats.includes(s)) selectedSeats.delete(s); });
    renderSeats();
    messageDiv.textContent = '';
  } catch (e) {
    console.error(e);
    messageDiv.textContent = 'Error memuat kursi.';
  }
}

loadBtn.addEventListener('click', loadReserved);

// submit reservation
bookingForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (selectedSeats.size === 0) return alert('Pilih minimal 1 kursi.');
  const payload = {
    name: document.getElementById('name').value.trim(),
    hp: document.getElementById('hp').value.trim(),
    date: dateInput.value,
    time: timeInput.value || '00:00',
    outlet: outletSelect.value,
    seats: Array.from(selectedSeats)
  };
  messageDiv.textContent = 'Mengirim reservasi...';
  try {
    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      messageDiv.textContent = 'Gagal: ' + (data.error || 'Unknown');
    } else {
      messageDiv.textContent = 'Berhasil! ID: ' + data.reservation.id;
      // Reset selection
      selectedSeats.clear();
      await loadReserved(); // reload reserved seats so new ones appear reserved
    }
  } catch (e) {
    console.error(e);
    messageDiv.textContent = 'Error saat mengirim reservasi.';
  }
});

// initial render
renderSeats();
