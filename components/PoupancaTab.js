'use client';

import { useState } from 'react';
import { formatBRL, hexTint, formatDateLabel, todayISO, digitsToAmount, amountToDigits, formatDigitsAsCurrency, extractDigits } from '../lib/format';

function emptyForm() {
  return { instituicao: '', valorDigits: '', data: todayISO() };
}

function formFromDeposito(p) {
  return { instituicao: p.instituicao, valorDigits: amountToDigits(p.valor), data: p.dataDeposito };
}

export default function PoupancaTab({ poupanca, onSubmit, onUpdate, onDelete }) {
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const valid = !!form.instituicao && parseInt(form.valorDigits || '0', 10) > 0 && !!form.data;

  function startEdit(p) {
    setEditingId(p.id);
    setForm(formFromDeposito(p));
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  }

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    const payload = { instituicao: form.instituicao, valor: digitsToAmount(form.valorDigits), dataDeposito: form.data };
    try {
      if (editingId) {
        await onUpdate(editingId, payload);
        setEditingId(null);
      } else {
        await onSubmit(payload);
      }
      setForm(emptyForm());
    } catch (e) {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId || deleting) return;
    if (!window.confirm('Excluir este depósito? Essa ação não pode ser desfeita.')) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete(editingId);
      setEditingId(null);
      setForm(emptyForm());
    } catch (e) {
      setError('Não foi possível excluir. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  const total = poupanca.reduce((s, t) => s + t.valor, 0);
  const sorted = poupanca.slice().sort((a, b) => new Date(b.dataDeposito) - new Date(a.dataDeposito));

  return (
    <div className="stack">
      <div className="card">
        <h2>{editingId ? 'Editar depósito' : 'Novo depósito'}</h2>
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
          <input
            type="text" inputMode="decimal"
            value={formatDigitsAsCurrency(form.valorDigits)}
            onChange={(e) => setForm((f) => ({ ...f, valorDigits: extractDigits(e.target.value) }))}
          />
        </label>
        <div className="form-actions">
          {error && <span className="form-error">{error}</span>}
          {editingId && (
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          )}
          {editingId && (
            <button className="btn-secondary" onClick={cancelEdit} disabled={saving || deleting}>Cancelar</button>
          )}
          <button className="btn-primary" onClick={handleSubmit} disabled={!valid || saving || deleting}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar depósito'}
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
              <div className="tx-row tx-row-clickable" key={p.id} onClick={() => startEdit(p)}>
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
