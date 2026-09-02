'use client';

import { formatBRL, hexTint, formatDateLabel, formatMesAnoLabel, periodicidadeLabel, groupKeyOf, MONTH_NAMES, GROUP_PALETTE } from '../lib/format';

export default function MonthlyReport({ despesas, receitas, year, month, onBack }) {
  const income = receitas.reduce((s, t) => s + t.valor, 0);
  const expense = despesas.reduce((s, t) => s + t.valor, 0);
  const balance = income - expense;

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
  const groups = order.map((k) => groupMap[k]).sort((a, b) => b.total - a.total);
  const colorByKey = {};
  groups.forEach((g, i) => { colorByKey[g.key] = GROUP_PALETTE[i % GROUP_PALETTE.length]; });

  const sortedDespesas = despesas.slice().sort((a, b) => new Date(a.dataPagamento) - new Date(b.dataPagamento));
  const sortedReceitas = receitas.slice().sort((a, b) => (a.nome > b.nome ? 1 : -1));

  function handlePrint() {
    window.print();
  }

  return (
    <div className="stack">
      <div className="report-title no-print">
        <button className="back-btn" onClick={onBack}>← Voltar</button>
        <button className="btn-primary" onClick={handlePrint}>Imprimir</button>
      </div>

      <div className="card">
        <div className="report-title" style={{ marginBottom: 20 }}>
          <h1>Relatório mensal</h1>
          <div className="month-nav-label">{MONTH_NAMES[month]} {year}</div>
        </div>
        <div className="summary-grid">
          <div>
            <p className="summary-label">Saldo</p>
            <p className="summary-value" style={{ color: balance >= 0 ? '#2E9E5B' : '#D14343' }}>{formatBRL(balance)}</p>
          </div>
          <div>
            <p className="summary-label">Receitas</p>
            <p className="summary-value positive">{formatBRL(income)}</p>
          </div>
          <div>
            <p className="summary-label">Despesas</p>
            <p className="summary-value negative">{formatBRL(expense)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="report-section-title">Despesas por tipo</h2>
        {groups.length ? (
          <div className="tx-list">
            {groups.map((g) => (
              <div className="tx-row" key={g.key}>
                <span className="group-dot" style={{ background: colorByKey[g.key] }}></span>
                <div className="tx-info">
                  <div className="tx-desc">{g.tipo + (g.tipoDetalhe ? ' · ' + g.tipoDetalhe : '')}</div>
                  <div className="tx-meta">{g.count} lançamento(s)</div>
                </div>
                <div className="tx-value negative">{formatBRL(g.total)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Nenhuma despesa neste mês.</div>
        )}
      </div>

      <div className="card">
        <h2 className="report-section-title">Despesas do mês</h2>
        {sortedDespesas.length ? (
          <div className="tx-list">
            {sortedDespesas.map((d) => {
              const key = groupKeyOf(d);
              const color = colorByKey[key] || '#9B9A93';
              const initialSrc = d.tipoDetalhe && d.tipoDetalhe.length ? d.tipoDetalhe : d.tipo;
              return (
                <div className="tx-row" key={d.id}>
                  <div className="tx-icon" style={{ background: hexTint(color, 0.82) }}>
                    <span className="tx-icon-letter" style={{ color }}>{initialSrc.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="tx-info">
                    <div className="tx-desc">{d.nome}</div>
                    <div className="tx-meta">{d.tipo}{d.tipoDetalhe ? ' · ' + d.tipoDetalhe : ''} · {periodicidadeLabel(d)} · {formatDateLabel(d.dataPagamento)}</div>
                  </div>
                  <div className="tx-value negative">{formatBRL(d.valor)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">Nenhuma despesa neste mês.</div>
        )}
      </div>

      <div className="card">
        <h2 className="report-section-title">Receitas do mês</h2>
        {sortedReceitas.length ? (
          <div className="tx-list">
            {sortedReceitas.map((r) => (
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
          <div className="empty-state">Nenhuma receita neste mês.</div>
        )}
      </div>
    </div>
  );
}
