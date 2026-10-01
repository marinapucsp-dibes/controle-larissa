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
  const [descontoDigits, setDescontoDigits] = useState('');
  const [jurosDigits, setJurosDigits] = useState('');
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { list, colorByKey } = computeGroups(despesas.filter((d) => d.tipo !== 'Poupança'));

  function pagamentoFor(g) {
    return pagamentos.find((p) => p.tipo === g.tipo && p.tipoDetalhe === g.tipoDetalhe) || null;
  }

  // "Efetivo" é quanto do valor pago realmente quita a despesa original:
  // desconto conta como se tivesse sido pago (reduz o que falta), e juros é
  // um acréscimo que o valor pago cobre sem contar como quitação - sem isso
  // um pagamento com desconto sobraria "faltando" e um com juros pareceria
  // pagamento a mais indevido.
  function efetivoOf(p) {
    if (!p) return 0;
    return p.valorPago + (p.desconto || 0) - (p.juros || 0);
  }

  function statusOf(g) {
    const p = pagamentoFor(g);
    const efetivo = efetivoOf(p);
    if (efetivo <= 0) return { state: 'unpaid', efetivo };
    if (efetivo >= g.total - 0.004) return { state: 'paid', efetivo };
    return { state: 'partial', efetivo };
  }

  function openSheet(g) {
    const status = statusOf(g);
    const restante = Math.max(0, g.total - status.efetivo);
    setOpenGroup(g);
    setValorDigits(amountToDigits(restante));
    setDescontoDigits('');
    setJurosDigits('');
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
        dataPagamento,
        desconto: digitsToAmount(descontoDigits),
        juros: digitsToAmount(jurosDigits)
      });
      setOpenGroup(null);
    } catch (e) {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const valorPagoNum = digitsToAmount(valorDigits);
  const descontoNum = digitsToAmount(descontoDigits);
  const jurosNum = digitsToAmount(jurosDigits);
  const restanteAposSalvar = openGroup
    ? Math.max(0, Math.round((openGroup.total - valorPagoNum - descontoNum + jurosNum) * 100) / 100)
    : 0;
  const nextMonthLabel = MONTH_NAMES[(month + 1) % 12];

  const totalGeral = list.reduce((s, g) => s + g.total, 0);
  const totalQuitado = list.reduce((s, g) => {
    const efetivo = statusOf(g).efetivo;
    return s + Math.max(0, Math.min(g.total, efetivo));
  }, 0);
  const faltaPagar = Math.max(0, Math.round((totalGeral - totalQuitado) * 100) / 100);

  return (
    <div className="stack">
      <div className="summary-grid">
        <div className="card">
          <p className="summary-label">Total do mês</p>
          <p className="summary-value">{formatBRL(totalGeral)}</p>
        </div>
        <div className="card">
          <p className="summary-label">Falta pagar</p>
          <p className="summary-value" style={{ color: faltaPagar > 0.004 ? '#D14343' : '#2E9E5B' }}>{formatBRL(faltaPagar)}</p>
        </div>
      </div>

      <div className="card">
        <h2>Contas do mês</h2>
        {list.length ? (
          <div className="group-grid">
            {list.map((g) => {
              const status = statusOf(g);
              const color = colorByKey[g.key];
              const label = g.tipo + (g.tipoDetalhe ? ' · ' + g.tipoDetalhe : '');
              const statusText = status.state === 'paid' ? 'Paga' : status.state === 'partial' ? 'Falta ' + formatBRL(g.total - status.efetivo) : 'Não paga';
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

            <div className="field-row">
              <label className="field">
                <span>Desconto</span>
                <input
                  type="text" inputMode="decimal"
                  value={formatDigitsAsCurrency(descontoDigits)}
                  onChange={(e) => setDescontoDigits(extractDigits(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Juros</span>
                <input
                  type="text" inputMode="decimal"
                  value={formatDigitsAsCurrency(jurosDigits)}
                  onChange={(e) => setJurosDigits(extractDigits(e.target.value))}
                />
              </label>
            </div>
            <div className="field-hint">
              Use desconto quando pagar menos por causa de um abatimento (ex: pagou R$ 95 de uma conta de R$ 100 com R$ 5 de desconto),
              e juros quando pagar mais por causa de atraso/multa (ex: pagou R$ 105 de uma conta de R$ 100 com R$ 5 de juros) -
              assim o saldo não fecha errado.
            </div>

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
