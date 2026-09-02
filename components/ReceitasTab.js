'use client';

import { useState } from 'react';
import { formatBRL, hexTint, formatMesAnoLabel, currentMonthISO } from '../lib/format';

const NOMES = ['Salário', 'Vale', 'Outro'];

function emptyForm() {
  return { nome: 'Salário', nomeCustom: '', valor: '', mesAno: currentMonthISO() };
}

export default function ReceitasTab({ receitas, onSubmit }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const finalNome = form.nome === 'Outro' ? form.nomeCustom.trim() : form.nome;
  const valid = !!finalNome && parseFloat(form.valor) > 0 && !!form.mesAno;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ nome: finalNome, valor: parseFloat(String(form.valor).replace(',', '.')), mesAno: form.mesAno });
      setForm({ ...emptyForm(), mesAno: form.mesAno });
    } catch (e) {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const sorted = receitas.slice().sort((a, b) => (b.mesAno > a.mesAno ? 1 : -1) || (b.id - a.id));

  return (
    <div className="stack">
      <div className="card">
        <h2>Nova receita</h2>

        <div className="field-label">Nome</div>
        <div className="pill-grid-3">
          {NOMES.map((n) => (
            <button
              key={n}
              className={'pill-btn' + (form.nome === n ? ' active' : '')}
              onClick={() => setForm((f) => ({ ...f, nome: n }))}
            >
              {n}
            </button>
          ))}
        </div>

        {form.nome === 'Outro' && (
          <label className="field">
            <span>Nome</span>
            <input type="text" value={form.nomeCustom} onChange={(e) => setForm((f) => ({ ...f, nomeCustom: e.target.value }))} placeholder="Ex: Bônus" />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span>Valor</span>
            <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
          </label>
          <label className="field">
            <span>Mês e ano</span>
            <input type="month" value={form.mesAno} onChange={(e) => setForm((f) => ({ ...f, mesAno: e.target.value }))} />
          </label>
        </div>

        <div className="form-actions">
          {error && <span className="form-error">{error}</span>}
          <button className="btn-primary" onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'Salvando...' : 'Adicionar receita'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Receitas cadastradas</h2>
        {sorted.length ? (
          <div className="tx-list">
            {sorted.map((r) => (
              <div className="tx-row" key={r.id}>
                <div className="tx-icon" style={{ background: hexTint('#2E9E5B', 0.85) }}>
                  <span className="tx-icon-letter" style={{ color: '#2E9E5B' }}>{r.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div className="tx-info">
                  <div className="tx-desc">{r.nome}</div>
                  <div className="tx-meta">{formatMesAnoLabel(r.mesAno)}</div>
                </div>
                <div className="tx-value positive">{formatBRL(r.valor)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Nenhuma receita cadastrada ainda.</div>
        )}
      </div>
    </div>
  );
}
