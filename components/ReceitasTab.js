'use client';

import { useState } from 'react';
import { formatBRL, hexTint, formatDateLabel, formatMesAnoLabel, currentMonthISO, todayISO, digitsToAmount, amountToDigits, formatDigitsAsCurrency, extractDigits } from '../lib/format';

const NOMES = ['Salário', 'Vale', 'Outro'];

function emptyForm() {
  return { nome: 'Salário', nomeCustom: '', valorDigits: '', mesAno: currentMonthISO(), dataRecebimento: todayISO() };
}

function formFromReceita(r) {
  const isPreset = NOMES.includes(r.nome);
  return {
    nome: isPreset ? r.nome : 'Outro',
    nomeCustom: isPreset ? '' : r.nome,
    valorDigits: amountToDigits(r.valor),
    mesAno: r.mesAno,
    dataRecebimento: r.dataRecebimento || todayISO()
  };
}

export default function ReceitasTab({ receitas, onSubmit, onUpdate, onDelete }) {
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const finalNome = form.nome === 'Outro' ? form.nomeCustom.trim() : form.nome;
  const valid = !!finalNome && parseInt(form.valorDigits || '0', 10) > 0 && !!form.mesAno && !!form.dataRecebimento;

  function startEdit(r) {
    setEditingId(r.id);
    setForm(formFromReceita(r));
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
    const payload = { nome: finalNome, valor: digitsToAmount(form.valorDigits), mesAno: form.mesAno, dataRecebimento: form.dataRecebimento };
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
    if (!window.confirm('Excluir esta receita? Essa ação não pode ser desfeita.')) return;
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

  const sorted = receitas.slice().sort((a, b) => (b.mesAno > a.mesAno ? 1 : -1) || (b.id - a.id));

  return (
    <div className="stack">
      <div className="card">
        <h2>{editingId ? 'Editar receita' : 'Nova receita'}</h2>

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
            <input
              type="text" inputMode="decimal"
              value={formatDigitsAsCurrency(form.valorDigits)}
              onChange={(e) => setForm((f) => ({ ...f, valorDigits: extractDigits(e.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Data que recebeu</span>
            <input type="date" value={form.dataRecebimento} onChange={(e) => setForm((f) => ({ ...f, dataRecebimento: e.target.value }))} />
          </label>
        </div>

        <label className="field">
          <span>Referente ao mês</span>
          <input type="month" value={form.mesAno} onChange={(e) => setForm((f) => ({ ...f, mesAno: e.target.value }))} />
        </label>
        <div className="field-hint">
          Dica: use "Referente ao mês" como o mês das contas que esse dinheiro vai pagar, não necessariamente o mês em que caiu na conta.
          Por exemplo, se o Vale recebido em outubro é pra pagar o empréstimo que vence em novembro, cadastre esse Vale como referente a Novembro -
          assim, ao olhar o mês de novembro, essa receita e essa despesa aparecem juntas e batendo certinho. A "Data que recebeu" fica só como registro de quando o dinheiro realmente entrou.
        </div>

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
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar receita'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Receitas cadastradas</h2>
        {sorted.length ? (
          <div className="tx-list">
            {sorted.map((r) => (
              <div className="tx-row tx-row-clickable" key={r.id} onClick={() => startEdit(r)}>
                <div className="tx-icon" style={{ background: hexTint('#2E9E5B', 0.85) }}>
                  <span className="tx-icon-letter" style={{ color: '#2E9E5B' }}>{r.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div className="tx-info">
                  <div className="tx-desc">{r.nome}</div>
                  <div className="tx-meta">
                    {formatMesAnoLabel(r.mesAno)}{r.dataRecebimento ? ' · recebido em ' + formatDateLabel(r.dataRecebimento) : ''}
                  </div>
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
