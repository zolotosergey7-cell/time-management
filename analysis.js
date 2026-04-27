// ===== API-КЛЮЧ (вставьте ваш ключ сюда) =====
const API_KEY = 'pza_ly6JcDXPLSWPgsTvgKoLuLsyJlUJBE80';

// ===== ИКОНКИ ДЛЯ ЦЕЛЕЙ =====
const ICONS = {
  'Здоровье':                              '🏃',
  'Интересная работа':                     '💼',
  'Высокая заработная плата':              '💰',
  'Общественное признание':                '🏆',
  'Возможность профессионального роста':   '📚',
  'Развлечения':                           '🎉',
  'Свобода':                               '🕊️',
  'Возможность общения':                   '🤝',
  'Счастливая семейная жизнь':             '👨‍👩‍👧',
  'Счастье других':                        '❤️',
};

// Запасные рекомендации — если API недоступен
const FALLBACK = {
  'Здоровье':
    'В вашем дне нет активностей для здоровья. Добавьте хотя бы 30 минут на спорт или прогулку.',
  'Интересная работа':
    'Вы не занимались любимым делом. Выделите время на задачи, которые вас вдохновляют.',
  'Высокая заработная плата':
    'Нет действий для роста дохода. Запланируйте время на развитие профессиональных навыков.',
  'Общественное признание':
    'Активностей для признания нет. Подумайте об участии в проектах или публичных выступлениях.',
  'Возможность профессионального роста':
    'В вашем дне нет обучения. Выделите 20–30 минут на книги или онлайн-курс.',
  'Развлечения':
    'Вы не отдыхали. Запланируйте время для восстановления — это повышает продуктивность.',
  'Свобода':
    'Нет свободного времени для себя. Добавьте хотя бы час без обязательств.',
  'Возможность общения':
    'Вы не общались с людьми. Запланируйте встречу или звонок другу.',
  'Счастливая семейная жизнь':
    'В вашем дне нет времени для семьи. Добавьте совместный ужин или звонок близким.',
  'Счастье других':
    'Вы не помогали другим. Найдите небольшое действие, которое сделает кого-то счастливее.',
};

// ===== ГЛАВНАЯ ФУНКЦИЯ АНАЛИЗА =====
async function runAnalysis() {
  const container = document.getElementById('recs-content');
  container.innerHTML = '<div class="loading">Анализируем ваш день...</div>';

  // Находим проблемные цели: топ-5 по рангу И реализация < 50%
  const problemGoals = state.task1.filter(
    item => item.rank <= 5 && item.percent < 50
  );

  // Если проблемных целей нет — всё хорошо
  if (problemGoals.length === 0) {
    container.innerHTML = `<p class="no-recs">
      ✅ Все важные цели реализованы на 50% и выше. Отличный результат!
    </p>`;
    return;
  }

  // Формируем промпт для Claude
  const goalLines      = problemGoals.map(g => `- ${g.name} (ранг ${g.rank}, реализовано ${g.percent}%)`).join('\n');
  const activityNames  = state.task2.map(a => a.activity).join(', ');

  const prompt = `Ты — помощник по тайм-менеджменту. Проанализируй данные студента.

ВАЖНЫЕ ЦЕЛИ СТУДЕНТА (топ-5), реализованные менее чем на 50%:
${goalLines}

ЧЕМ СТУДЕНТ ЗАНИМАЛСЯ ВЧЕРА:
${activityNames}

ЗАДАЧА:
Для каждой цели определи: есть ли в расписании хотя бы одно мероприятие, которое ведёт к этой цели?
Для целей, где такого мероприятия НЕТ — напиши короткую практичную рекомендацию на русском (1–2 предложения).

Отвечай ТОЛЬКО в формате JSON, без пояснений и markdown:
{
  "results": [
    {
      "goal": "название цели",
      "covered": true или false,
      "recommendation": "текст если covered=false, иначе пустая строка"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Ошибка ${response.status}`);
    }

    const data  = await response.json();
    const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    renderRecs(parsed.results);

  } catch (err) {
    console.error('API error:', err);
    // Показываем ошибку и запасные рекомендации
    container.innerHTML = `<p style="color:var(--danger);font-size:13px;margin-bottom:14px">
      ⚠️ Не удалось получить ответ от Claude: ${err.message}.<br>
      Показываем стандартные рекомендации.
    </p>`;
    renderFallback(problemGoals);
  }
}

// ===== ОТРИСОВКА РЕКОМЕНДАЦИЙ ОТ CLAUDE =====
function renderRecs(results) {
  const container = document.getElementById('recs-content');
  const uncovered = results.filter(r => !r.covered && r.recommendation);

  if (uncovered.length === 0) {
    container.innerHTML = `<p class="no-recs">
      ✅ В вашем расписании нашлись действия для всех важных целей. Хорошая работа!
    </p>`;
    return;
  }

  container.innerHTML = uncovered.map(item => `
    <div class="rec-item">
      <span class="rec-icon">${ICONS[item.goal] || '🎯'}</span>
      <div>
        <div class="rec-goal">${item.goal}</div>
        <div class="rec-text">${item.recommendation}</div>
      </div>
    </div>
  `).join('');

  // Сохраняем для экспорта
  state.recommendations = uncovered.map(r => ({
    goal: r.goal,
    recommendation: r.recommendation,
  }));
}

// ===== ЗАПАСНЫЕ РЕКОМЕНДАЦИИ (без API) =====
function renderFallback(problemGoals) {
  const container = document.getElementById('recs-content');

  const items = problemGoals.map(g => ({
    goal: g.name,
    recommendation: FALLBACK[g.name] || 'Уделите время этой важной для вас цели.',
  }));

  container.innerHTML += items.map(item => `
    <div class="rec-item">
      <span class="rec-icon">${ICONS[item.goal] || '🎯'}</span>
      <div>
        <div class="rec-goal">${item.goal}</div>
        <div class="rec-text">${item.recommendation}</div>
      </div>
    </div>
  `).join('');

  state.recommendations = items;
}