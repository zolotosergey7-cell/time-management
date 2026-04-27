// ===== СПИСОК ЦЕННОСТЕЙ =====
const VALUES = [
  'Здоровье',
  'Интересная работа',
  'Высокая заработная плата',
  'Общественное признание',
  'Возможность профессионального роста',
  'Развлечения',
  'Свобода',
  'Возможность общения',
  'Счастливая семейная жизнь',
  'Счастье других',
];

// ===== ХРАНИЛИЩЕ ДАННЫХ СЕССИИ =====
const state = {
  studentName: '',
  apiKey: '',
  task1: [],        // [{name, rank, percent}]
  task2: [],        // [{activity, time, duration}]
  recommendations: [], // [{goal, recommendation}]
};

// ===== НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ =====
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== ЭКРАН 1: СТАРТ =====
function startApp() {
  const name = document.getElementById('student-name').value.trim();
  if (!name) {
    alert('Пожалуйста, введите ваше имя.');
    return;
  }
  state.studentName = name;
  buildTask1();
  goTo('screen-task1');
}

// ===== ЭКРАН 2: ЗАДАНИЕ 1 — ЦЕННОСТИ =====
function buildTask1() {
  const list = document.getElementById('values-list');
  list.innerHTML = '';

  VALUES.forEach((value, index) => {
    const li = document.createElement('li');
    li.className    = 'val-row';
    li.dataset.name = value;
    li.innerHTML = `
      <span class="val-rank">${index + 1}</span>
      <span class="val-name">${value}</span>
      <span>
        <input
          type="number"
          class="pct-input"
          min="0" max="100"
          placeholder="0–100"
        />
      </span>
    `;
    list.appendChild(li);
  });

  // Drag-and-drop — перетаскивание строк
  Sortable.create(list, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: updateRanks,
  });
}

// Пересчитываем ранги после перетаскивания
function updateRanks() {
  document.querySelectorAll('#values-list .val-row').forEach((row, i) => {
    row.querySelector('.val-rank').textContent = i + 1;
  });
}

// Кнопка «Далее» на экране 1
function submitTask1() {
  const rows  = document.querySelectorAll('#values-list .val-row');
  const result = [];
  let valid    = true;

  rows.forEach((row, i) => {
    const name    = row.dataset.name;
    const rank    = i + 1;
    const input   = row.querySelector('.pct-input');
    const percent = parseInt(input.value, 10);

    if (isNaN(percent) || percent < 0 || percent > 100) {
      input.style.borderColor = 'var(--danger)';
      valid = false;
    } else {
      input.style.borderColor = '';
      result.push({ name, rank, percent });
    }
  });

  if (!valid) {
    alert('Заполните все поля реализованности (0–100%).');
    return;
  }

  state.task1 = result;
  buildTask2();
  goTo('screen-task2');
}

// ===== ЭКРАН 3: ЗАДАНИЕ 2 — ХРОНОМЕТРАЖ =====
let rowId = 0;

function buildTask2() {
  const container = document.getElementById('chrono-list');
  container.innerHTML = '';
  rowId = 0;
  // 8 пустых строк по умолчанию
  for (let i = 0; i < 8; i++) addRow();
}

function addRow() {
  const container = document.getElementById('chrono-list');
  const id = ++rowId;

  const div = document.createElement('div');
  div.className = 'ch-row';
  div.id        = `row-${id}`;
  div.innerHTML = `
    <input type="text"   class="ch-input"     placeholder="Например: сон, работа, спорт..." />
    <input type="text"   class="ch-input"     placeholder="09:00–10:30" />
    <input type="number" class="ch-input dur" placeholder="мин."
           min="0" max="1440" oninput="updateTotal()" />
    <button class="btn-del" onclick="delRow('row-${id}')" title="Удалить">×</button>
  `;
  container.appendChild(div);
  updateTotal();
}

function delRow(id) {
  const row = document.getElementById(id);
  if (row) { row.remove(); updateTotal(); }
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('#chrono-list .dur').forEach(inp => {
    const v = parseInt(inp.value, 10);
    if (!isNaN(v) && v > 0) total += v;
  });

  const el = document.getElementById('minutes-total');
  el.textContent = total;
  el.className   = total === 1440 ? 'ok' : total > 1440 ? 'over' : '';
}

// Кнопка «Получить результат»
function submitTask2() {
  const rows   = document.querySelectorAll('#chrono-list .ch-row');
  const result = [];

  rows.forEach(row => {
    const inputs   = row.querySelectorAll('input');
    const activity = inputs[0].value.trim();
    const time     = inputs[1].value.trim();
    const duration = parseInt(inputs[2].value, 10);

    if (activity && !isNaN(duration) && duration > 0) {
      result.push({ activity, time, duration });
    }
  });

  if (result.length === 0) {
    alert('Добавьте хотя бы одно мероприятие с названием и продолжительностью.');
    return;
  }

  const total = result.reduce((s, r) => s + r.duration, 0);
  if (total !== 1440) {
    const go = confirm(`Сумма минут: ${total} (нужно 1440).\nВсё равно продолжить?`);
    if (!go) return;
  }

  state.task2 = result;
  buildResults();
  goTo('screen-results');
  runAnalysis(); // запускаем ИИ-анализ (analysis.js)
}

// ===== ЭКРАН 4: ОТРИСОВКА РЕЗУЛЬТАТОВ =====
function buildResults() {
  document.getElementById('result-name').textContent = `Студент: ${state.studentName}`;

  // — Задание 1 —
  let h1 = `<table class="res-table">
    <thead><tr><th>Ранг</th><th>Ценность</th><th>Реализовано</th></tr></thead>
    <tbody>`;

  state.task1.forEach(item => {
    const cls  = item.percent < 50 ? 'low' : item.percent < 75 ? 'mid' : 'high';
    const warn = (item.rank <= 5 && item.percent < 50) ? 'warn' : '';
    h1 += `<tr class="${warn}">
      <td><span class="badge-num">${item.rank}</span></td>
      <td>${item.name}</td>
      <td><span class="pill ${cls}">${item.percent}%</span></td>
    </tr>`;
  });

  h1 += `</tbody></table>
    <p style="margin-top:10px;font-size:12px;color:var(--muted)">
      Строки на жёлтом фоне — важные цели (топ-5) с реализацией менее 50%.
    </p>`;
  document.getElementById('result-values').innerHTML = h1;

  // — Задание 2 —
  let h2 = `<table class="res-table">
    <thead><tr><th>Мероприятие</th><th>Время</th><th>Минут</th></tr></thead>
    <tbody>`;

  state.task2.forEach(item => {
    h2 += `<tr>
      <td>${item.activity}</td>
      <td style="color:var(--muted)">${item.time || '—'}</td>
      <td><strong>${item.duration}</strong></td>
    </tr>`;
  });

  const total = state.task2.reduce((s, r) => s + r.duration, 0);
  h2 += `</tbody>
    <tfoot><tr>
      <td colspan="2" style="font-weight:700;padding:9px 10px">Итого</td>
      <td style="font-weight:800;font-size:16px;padding:9px 10px">${total}</td>
    </tr></tfoot>
  </table>`;
  document.getElementById('result-chrono').innerHTML = h2;
}

// ===== СБРОС =====
function resetApp() {
  if (!confirm('Начать заново? Все данные будут удалены.')) return;
  Object.assign(state, { studentName:'', apiKey:'', task1:[], task2:[], recommendations:[] });
  document.getElementById('student-name').value = '';
  document.getElementById('api-key').value      = '';
  rowId = 0;
  goTo('screen-start');
}