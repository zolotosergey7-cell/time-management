// ===== ЭКСПОРТ В PDF =====
async function exportPDF() {
  const { jsPDF } = window.jspdf;

  // Прячем панель кнопок чтобы она не попала в снимок
  const bar = document.querySelector('.export-bar');
  bar.style.display = 'none';

  const content = document.getElementById('results-content');

  try {
    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#F2EFE9',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW   = pdf.internal.pageSize.getWidth();
    const pageH   = pdf.internal.pageSize.getHeight();
    const imgW    = pageW - 20;
    const imgH    = (canvas.height * imgW) / canvas.width;
    const margin  = 10;

    // Если контент длиннее одной страницы — разбиваем на страницы
    let yOffset = 0;
    while (yOffset < imgH) {
      pdf.addImage(imgData, 'PNG', margin, margin - yOffset, imgW, imgH);
      yOffset += pageH - margin * 2;
      if (yOffset < imgH) pdf.addPage();
    }

    const name = state.studentName.replace(/\s+/g, '_') || 'student';
    pdf.save(`tайм-менеджмент_${name}.pdf`);

  } catch (err) {
    alert('Не удалось создать PDF: ' + err.message);
  } finally {
    bar.style.display = 'flex';
  }
}

// ===== ЭКСПОРТ В EXCEL =====
function exportExcel() {
  const wb = XLSX.utils.book_new();

  // ── Лист 1: Ценности ──
  const sheet1 = [
    [`Студент: ${state.studentName}`],
    [],
    ['Ранг', 'Ценность', 'Реализовано (%)', 'Важная (топ-5)?', 'Требует внимания?'],
  ];

  state.task1.forEach(item => {
    sheet1.push([
      item.rank,
      item.name,
      item.percent,
      item.rank <= 5 ? 'Да' : 'Нет',
      (item.rank <= 5 && item.percent < 50) ? '⚠ Да' : 'Нет',
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1);
  ws1['!cols'] = [{ wch: 6 }, { wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Задание 1 — Ценности');

  // ── Лист 2: Хронометраж ──
  const sheet2 = [
    [`Студент: ${state.studentName}`],
    [],
    ['Мероприятие', 'Время', 'Минут'],
  ];

  state.task2.forEach(item => {
    sheet2.push([item.activity, item.time || '', item.duration]);
  });

  const total = state.task2.reduce((s, r) => s + r.duration, 0);
  sheet2.push([]);
  sheet2.push(['ИТОГО', '', total]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2);
  ws2['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Задание 2 — Хронометраж');

  // ── Лист 3: Рекомендации ──
  const sheet3 = [
    [`Студент: ${state.studentName}`],
    [],
    ['Цель', 'Рекомендация'],
  ];

  if (state.recommendations && state.recommendations.length > 0) {
    state.recommendations.forEach(r => {
      sheet3.push([r.goal, r.recommendation]);
    });
  } else {
    sheet3.push(['—', 'Все важные цели присутствуют в расписании.']);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3);
  ws3['!cols'] = [{ wch: 34 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Рекомендации');

  // Скачиваем файл
  const name = state.studentName.replace(/\s+/g, '_') || 'student';
  XLSX.writeFile(wb, `тайм-менеджмент_${name}.xlsx`);
}