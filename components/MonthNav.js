'use client';

import { useState } from 'react';
import { MONTH_NAMES } from '../lib/format';

export default function MonthNav({ year, month, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(toMonthInputValue(year, month));

  function go(deltaMonths) {
    const d = new Date(year, month + deltaMonths, 1);
    onChange(d.getFullYear(), d.getMonth());
  }

  function openPicker() {
    setDraft(toMonthInputValue(year, month));
    setPickerOpen(true);
  }

  function jumpToToday() {
    const now = new Date();
    onChange(now.getFullYear(), now.getMonth());
    setPickerOpen(false);
  }

  function applyDraft() {
    if (!draft) return;
    const [y, m] = draft.split('-').map(Number);
    onChange(y, m - 1);
    setPickerOpen(false);
  }

  return (
    <div className="month-nav">
      <button className="month-nav-arrow" onClick={() => go(-1)} aria-label="Mês anterior">‹</button>
      <button className="month-nav-label" onClick={openPicker}>
        {MONTH_NAMES[month]} {year}
      </button>
      <button className="month-nav-arrow" onClick={() => go(1)} aria-label="Próximo mês">›</button>

      {pickerOpen && (
        <div className="month-picker-overlay" onClick={() => setPickerOpen(false)}>
          <div className="month-picker-card" onClick={(e) => e.stopPropagation()}>
            <div className="month-picker-title">Ir para o mês</div>
            <input
              type="month"
              className="input-month"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="month-picker-actions">
              <button className="btn-secondary" onClick={jumpToToday}>Hoje</button>
              <button className="btn-primary" onClick={applyDraft}>Ir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toMonthInputValue(year, month) {
  return year + '-' + String(month + 1).padStart(2, '0');
}
