'use client';

import { useState } from 'react';
import {
  formatBRL, hexTint, formatDateLabel, periodicidadeLabel, groupKeyOf, todayISO, GROUP_PALETTE,
  digitsToAmount, amountToDigits, formatDigitsAsCurrency, extractDigits
} from '../lib/format';

const TIPOS = ['Cartão de Crédito', 'Empréstimo', 'Boleto', 'Terceiros'];
const PERIODOS = [
  { key: 'unica', label: 'Parcela única' },
  { key: 'parcelado', label: 'Parcelado' },
  { key: 'recorrente', label: 'Recorrente' }
];
const DETALHE_LABEL = {
  'Cartão de Crédito': { label: 'Nome do cartão', placeholder: 'Ex: Nubank' },
  'Empréstimo': { label: 'Nome do banco', placeholder: 'Ex: Banco do Brasil' },
  'Terceiros': { label: 'Nome de quem deve', placeholder: 'Ex: Gabi' }
};

function emptyForm() {
  return { tipo: 'Cartão de Crédito', tipoDetalhe: '', nome: '', periodicidade: 'unica', parcelaAtual: '', parcelaTotal: '2', valorDigits: '', dataPagamento: todayISO() };
}

function formFromDespesa(d) {
  return {
    tipo: d.tipo,
    tipoDetalhe: d.tipoDetalhe || '',
    nome: d.nome,
    periodicidade: d.periodicidade,
    parcelaAtual: d.parcelaAtual || '',
    parcelaTotal: '2',
    valorDigits: amountToDigits(d.valor),
    dataPagamento: d.dataPagamento
  };
}

function colorsByGroup(despesas) {
  const order = [];
  const seen = {};
  despesas.forEach((d) => {
    const key = groupKeyOf(d);
    if (!seen[key]) { seen[key] = true; order.push({ key, total: 0 }); }
  });
  despesas.forEach((d) => {
    const key = groupKeyOf(d);
    const entry = order.find((o) => o.key === key);
    entry.total += d.valor;
  });
  order.sort((a, b) => b.total - a.total);
  const map = {};
  order.forEach((o, i) => { map[o.key] = GROUP_PALETTE[i % GROUP_PALETTE.length]; });
  return map;
}

export default function DespesasTab({ despesas, onSubmit, onUpdate, onDelete }) {
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const needsDetalhe = !!DETALHE_LABEL[form.tipo];
  const parcelaTotalNum = parseInt(form.parcelaTotal, 10);
  const valid =
    !!form.nome &&
    parseInt(form.valorDigits || '0', 10) > 0 &&
    !!form.dataPagamento &&
    (!needsDetalhe || !!form.tipoDetalhe) &&
    (form.periodicidade !== 'parcelado' || (editingId ? !!form.parcelaAtual : (parcelaTotalNum >= 2 && parcelaTotalNum <= 60)));

  function startEdit(d) {
    setEditingId(d.id);
    setForm(formFromDespesa(d));
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
    const base = {
      tipo: form.tipo,
      tipoDetalhe: needsDetalhe ? form.tipoDetalhe : '',
      nome: form.nome,
      periodicidade: form.periodicidade,
      valor: digitsToAmount(form.valorDigits),
      dataPagamento: form.dataPagamento
    };
    try {
      if (editingId) {
        await onUpdate(editingId, { ...base, parcelaAtual: form.periodicidade === 'parcelado' ? form.parcelaAtual : '' });
        setEditingId(null);
      } else {
        await onSubmit({ ...base, parcelaTotal: form.periodicidade === 'parcelado' ? parcelaTotalNum : undefined });
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
    if (!window.confirm('Excluir esta despesa? Essa ação não pode ser desfeita.')) return;
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

  const colorByKey = colorsByGroup(despesas);
  const sorted = despesas.slice().sort((a, b) => new Date(b.dataPagamento) - new Date(a.dataPagamento));
  const detalheInfo = DETALHE_LABEL[form.tipo];

  return (
    <div className="stack">
      <div className="card">
        <h2>{editingId ? 'Editar despesa' : 'Nova despesa'}</h2>

        <div className="field-label">Tipo</div>
        <div className="pill-grid-4">
          {TIPOS.map((t) => (
            <button
              key={t}
              className={'pill-btn' + (form.tipo === t ? ' active' : '')}
              onClick={() => setForm((f) => ({ ...f, tipo: t, tipoDetalhe: '' }))}
            >
              {t}
            </button>
          ))}
        </div>

        {detalheInfo && (
          <label className="field">
            <span>{detalheInfo.label}</span>
            <input type="text" value={form.tipoDetalhe} onChange={(e) => setForm((f) => ({ ...f, tipoDetalhe: e.target.value }))} placeholder={detalheInfo.placeholder} />
          </label>
        )}

        <label className="field">
          <span>Nome da despesa</span>
          <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Supermercado" />
        </label>

        <div className="field-label">Periodicidade</div>
        <div className="pill-grid-3">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              className={'pill-btn' + (form.periodicidade === p.key ? ' active' : '')}
              onClick={() => setForm((f) => ({ ...f, periodicidade: p.key, parcelaAtual: '' }))}
            >
              {p.label}
            </button>
          ))}
        </div>

        {form.periodicidade === 'parcelado' && !editingId && (
          <label className="field">
            <span>Em quantas parcelas?</span>
            <input
              type="number" min="2" max="60" value={form.parcelaTotal}
              onChange={(e) => setForm((f) => ({ ...f, parcelaTotal: e.target.value }))}
            />
          </label>
        )}
        {form.periodicidade === 'parcelado' && !!editingId && (
          <label className="field">
            <span>Parcela atual</span>
            <input type="text" value={form.parcelaAtual} onChange={(e) => setForm((f) => ({ ...f, parcelaAtual: e.target.value }))} placeholder="Ex: 1/6" />
          </label>
        )}
        {form.periodicidade === 'parcelado' && !editingId && parcelaTotalNum >= 2 && (
          <div className="field-hint">Vai lançar a parcela 1/{parcelaTotalNum} neste mês e as seguintes automaticamente nos próximos meses.</div>
        )}
        {form.periodicidade === 'recorrente' && !editingId && (
          <div className="field-hint">Vai lançar essa despesa neste mês e se repetir automaticamente pelos próximos 12 meses.</div>
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
            <span>Data do pagamento</span>
            <input type="date" value={form.dataPagamento} onChange={(e) => setForm((f) => ({ ...f, dataPagamento: e.target.value }))} />
          </label>
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
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar despesa'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Despesas cadastradas</h2>
        {sorted.length ? (
          <div className="tx-list">
            {sorted.map((d) => {
              const key = groupKeyOf(d);
              const color = colorByKey[key] || '#9B9A93';
              const initialSrc = d.tipoDetalhe && d.tipoDetalhe.length ? d.tipoDetalhe : d.tipo;
              const tipoLabel = d.tipo + (d.tipoDetalhe ? ' · ' + d.tipoDetalhe : '');
              return (
                <div className="tx-row tx-row-clickable" key={d.id} onClick={() => startEdit(d)}>
                  <div className="tx-icon" style={{ background: hexTint(color, 0.82) }}>
                    <span className="tx-icon-letter" style={{ color }}>{initialSrc.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="tx-info">
                    <div className="tx-desc">{d.nome}</div>
                    <div className="tx-meta">{tipoLabel} · {periodicidadeLabel(d)} · {formatDateLabel(d.dataPagamento)}</div>
                  </div>
                  <div className="tx-value negative">{formatBRL(d.valor)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">Nenhuma despesa cadastrada ainda.</div>
        )}
      </div>
    </div>
  );
}
