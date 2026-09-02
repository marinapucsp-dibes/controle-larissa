'use client';

import { formatBRL, GROUP_PALETTE, formatDateLabel, periodicidadeLabel, groupKeyOf } from '../lib/format';

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
  return { groupMap, list, colorByKey };
}

export default function Dashboard({ despesas, receitas, selectedGroupKey, onSelectGroup }) {
  const income = receitas.reduce((s, t) => s + t.valor, 0);
  const expense = despesas.reduce((s, t) => s + t.valor, 0);
  const balance = income - expense;
  const maxBar = Math.max(income, expense) || 1;
  const incomePct = Math.round((income / maxBar) * 100);
  const expensePct = Math.round((expense / maxBar) * 100);

  const { groupMap, list, colorByKey } = computeGroups(despesas);
  const selectedGroup = selectedGroupKey ? groupMap[selectedGroupKey] : null;

  let rightPanel;
  if (selectedGroup) {
    const label = selectedGroup.tipo + (selectedGroup.tipoDetalhe ? ' · ' + selectedGroup.tipoDetalhe : '');
    const entries = despesas
      .filter((d) => groupKeyOf(d) === selectedGroupKey)
      .slice()
      .sort((a, b) => new Date(b.dataPagamento) - new Date(a.dataPagamento));

    rightPanel = (
      <>
        <div className="detail-header">
          <button className="back-btn" onClick={() => onSelectGroup(null)}>← Voltar</button>
          <h2>{label}</h2>
        </div>
        {entries.length ? (
          <div className="tx-list">
            {entries.map((d) => (
              <div className="tx-row" key={d.id}>
                <div className="tx-info">
                  <div className="tx-desc">{d.nome}</div>
                  <div className="tx-meta">{periodicidadeLabel(d)} · {formatDateLabel(d.dataPagamento)}</div>
                </div>
                <div className="tx-value negative">{formatBRL(d.valor)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Nenhum lançamento neste grupo.</div>
        )}
      </>
    );
  } else if (list.length) {
    rightPanel = (
      <>
        <h2>Despesas por tipo</h2>
        <div className="group-grid">
          {list.map((g) => {
            const label = g.tipo + (g.tipoDetalhe ? ' · ' + g.tipoDetalhe : '');
            const color = colorByKey[g.key];
            return (
              <button className="group-card" key={g.key} onClick={() => onSelectGroup(g.key)}>
                <div className="group-card-top">
                  <span className="group-dot" style={{ background: color }}></span>
                  <span className="group-count">{g.count} lançamento(s)</span>
                </div>
                <div className="group-label">{label}</div>
                <div className="group-total" style={{ color }}>{formatBRL(g.total)}</div>
              </button>
            );
          })}
        </div>
      </>
    );
  } else {
    rightPanel = (
      <>
        <h2>Despesas por tipo</h2>
        <div className="empty-state">Nenhuma despesa cadastrada ainda.</div>
      </>
    );
  }

  return (
    <>
      <div className="summary-grid">
        <div className="card">
          <p className="summary-label">Saldo</p>
          <p className="summary-value" style={{ color: balance >= 0 ? '#2E9E5B' : '#D14343' }}>{formatBRL(balance)}</p>
        </div>
        <div className="card">
          <p className="summary-label">Receitas</p>
          <p className="summary-value positive">{formatBRL(income)}</p>
        </div>
        <div className="card">
          <p className="summary-label">Despesas</p>
          <p className="summary-value negative">{formatBRL(expense)}</p>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2>Receitas x despesas</h2>
          <div className="bar-chart">
            <div>
              <div className="bar-row-head"><span>Receitas</span><span className="positive">{formatBRL(income)}</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: incomePct + '%', background: '#2E9E5B' }}></div></div>
            </div>
            <div>
              <div className="bar-row-head"><span>Despesas</span><span className="negative">{formatBRL(expense)}</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: expensePct + '%', background: '#D14343' }}></div></div>
            </div>
          </div>
        </div>
        <div className="card">{rightPanel}</div>
      </div>
    </>
  );
}
