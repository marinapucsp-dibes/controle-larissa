'use client';

import { useState } from 'react';
import {
  formatBRL, hexTint, groupKeyOf, todayISO, GROUP_PALETTE, MONTH_NAMES,
  digitsToAmount, amountToDigits, formatDigitsAsCurrency, extractDigits
} from '../lib/format';

function computeGroups(despesas) {
  const groupMap = {};
  const order = [];
  despesas.forEach((d) => {
    const key = groupKeyOf(d);
    if (!groupMap[key]) {
      groupMap[key] = { key, tipo: d.tipo, tipoDetalhe: d.tipoDetalhe, total: 0, count: 0 };
      order.push(key);
    }
    groupMap[key].total += d.valor;
    groupMap[key].count += 1;
  });
  const list = order.map((k) => groupMap[k]).sort((a, b) => b.total - a.total);
  const colorByKey = {};
  list.forEach((g, i) => { colorByKey[g.key] = GROUP_PALETTE[i % GROUP_PALETTE.length]; });
  return { list, colorByKey };
}

export default function ContasTab({ despesas, pagamentos, year, month, onRegistrarPagamento }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [valorDigits, setValorDigits] = useState('');
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { list, colorByKey } = computeGroups(despesas.filter((d) => d.tipo !== 'Poupança'));

  function pagamentoFor(g) {
    return pagamentos.find((p) => p.tipo === g.tipo && p.tipoDetalhe === g.tipoDetalhe) || null;
  }

  function statusOf(g) {
    const p = pagamentoFor(g);
    const valorPago = p ? p.valorPago : 0;
    if (valorPago <= 0) return { state: 'unpaid', valorPago };
    if (valorPago >= g.total - 0.004) return { state: 'paid', valorPago };
    return { state: 'partial', valorPago };
  }

  function openSheet(g) {
    const status = statusOf(g);
    const restante = Math.max(0, g.total - status.valorPago);
    setOpenGroup(g);
    setValorDigits(amountToDigits(restante));
    setDataPagamento(todayISO());
    setError('');
  }

  function closeSheet() {
    setOpenGroup(null);
    setError('');
  }

  async function handleSave() {
    if (!openGroup || saving) return;
    const valorPago = digitsToAmount(valorDigits);
    if (!(valorPago > 0) || !dataPagamento) return;
    setSaving(true);
    setError('');
    try {
      await onRegistrarPagamento({
        tipo: openGroup.tipo,
        tipoDetalhe: openGroup.tipoDetalhe,
        ano: year,
        mes: month + 1,
        valorPago,
        dataPagamento
      });
      setOpenGroup(null);
    } catch (e) {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const valorPagoNum = digitsToAmount(valorDigits);
  const restanteAposSalvar = openGroup ? Math.max(0, Math.round((openGroup.total - valorPagoNum) * 100) / 100) : 0;
  const nextMonthLabel = MONTH_NAMES[(month + 1) % 12];

  return (
    <div className="stack">
      <div className="card">
        <h2>Contas do mês</h2>
        {list.length ? (
          <div className="group-grid">
            {list.map((g) => {
              const status = statusOf(g);
              const color = colorByKey[g.key];
              const label = g.tipo + (g.tipoDetalhe ? ' · ' + g.tipoDetalhe : '');
              const statusText = status.state === 'paid' ? 'Paga' : status.state === 'partial' ? 'Falta ' + formatBRL(g.total - status.valorPago) : 'Não paga';
              const statusColor = status.state === 'paid' ? '#2E9E5B' : status.state === 'partial' ? '#E0A548' : '#6B685F';
              return (
                <button className="group-card" key={g.key} onClick={() => openSheet(g)}>
                  <div className="group-card-top">
                    <span className="group-dot" style={{ background: color }}></span>
                    <span className="group-count" style={{ color: statusColor }}>{statusText}</span>
                  </div>
                  <div className="group-label">{label}</div>
                  <div className="group-total" style={{ color }}>{formatBRL(g.total)}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">Nenhuma despesa neste mês ainda.</div>
        )}
      </div>

      {openGroup && (
        <div className="month-picker-overlay" onClick={closeSheet}>
          <div className="month-picker-card" onClick={(e) => e.stopPropagation()} style={{ width: 340 }}>
            <div className="month-picker-title">{openGroup.tipo}{openGroup.tipoDetalhe ? ' · ' + openGroup.tipoDetalhe : ''}</div>
            <div className="field-hint" style={{ marginBottom: 18 }}>Total do mês: {formatBRL(openGroup.total)}</div>

            <label className="field">
              <span>Valor pago</span>
              <input
                type="text" inputMode="decimal"
                value={formatDigitsAsCurrency(valorDigits)}
                onChange={(e) => setValorDigits(extractDigits(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Data do pagamento</span>
              <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
            </label>

            {restanteAposSalvar > 0.004 && (
              <div className="field-hint">
                Restam {formatBRL(restanteAposSalvar)}, que serão lançados automaticamente em {nextMonthLabel}.
              </div>
            )}

            <div className="month-picker-actions">
              {error && <span className="form-error">{error}</span>}
              <button className="btn-secondary" onClick={closeSheet} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !(valorPagoNum > 0)}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
