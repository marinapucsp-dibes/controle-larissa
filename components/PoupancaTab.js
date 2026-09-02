'use client';

import { useState } from 'react';
import { formatBRL, hexTint, formatDateLabel, todayISO } from '../lib/format';

function emptyForm() {
  return { instituicao: '', valor: '', data: todayISO() };
}

export default function PoupancaTab({ poupanca, onSubmit }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valid = !!form.instituicao && parseFloat(form.valor) > 0 && !!form.data;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ instituicao: form.instituicao, valor: parseFloat(String(form.valor).replace(',', '.')), dataDeposito: form.data });
      setForm({ ...emptyForm(), data: form.data });
    } catch (e) {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const total = poupanca.reduce((s, t) => s + t.valor, 0);
  const sorted = poupanca.slice().sort((a, b) => new Date(b.dataDeposito) - new Date(a.dataDeposito));

  return (
    <div className="stack">
      <div className="card">
        <h2>Novo depósito</h2>
        <div className="field-row">
          <label className="field">
            <span>Instituição</span>
            <input type="text" value={form.instituicao} onChange={(e) => setForm((f) => ({ ...f, instituicao: e.target.value }))} placeholder="Ex: Nubank Caixinha" />
          </label>
          <label className="field">
            <span>Data do depósito</span>
            <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
          </label>
        </div>
        <label className="field">
          <span>Valor</span>
          <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
        </label>
        <div className="form-actions">
          {error && <span className="form-error">{error}</span>}
          <button className="btn-primary" onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'Salvando...' : 'Adicionar depósito'}
          </button>
        </div>
      </div>

      <div className="card">
        <p className="summary-label">Total guardado</p>
        <p className="summary-value positive">{formatBRL(total)}</p>
      </div>

      <div className="card">
        <h2>Depósitos</h2>
        {sorted.length ? (
          <div className="tx-list">
            {sorted.map((p) => (
              <div className="tx-row" key={p.id}>
                <div className="tx-icon" style={{ background: hexTint('#2E9E5B', 0.85) }}>
                  <span className="tx-icon-letter" style={{ color: '#2E9E5B' }}>{p.instituicao.charAt(0).toUpperCase()}</span>
                </div>
                <div className="tx-info">
                  <div className="tx-desc">{p.instituicao}</div>
                  <div className="tx-meta">{formatDateLabel(p.dataDeposito)}</div>
                </div>
                <div className="tx-value positive">{formatBRL(p.valor)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Nenhum depósito cadastrado ainda.</div>
        )}
      </div>
    </div>
  );
}
