'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Dashboard from '../components/Dashboard';
import DespesasTab from '../components/DespesasTab';
import ReceitasTab from '../components/ReceitasTab';
import PoupancaTab from '../components/PoupancaTab';
import ContasTab from '../components/ContasTab';
import MonthNav from '../components/MonthNav';
import MonthlyReport from '../components/MonthlyReport';
import { isDateInMonth, isMesAnoInMonth } from '../lib/format';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'despesas', label: 'Despesas' },
  { key: 'receitas', label: 'Receitas' },
  { key: 'poupanca', label: 'Poupança' },
  { key: 'contas', label: 'Contas' }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [despesas, setDespesas] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [poupanca, setPoupanca] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [reportOpen, setReportOpen] = useState(false);

  const monthDespesas = useMemo(
    () => despesas.filter((d) => isDateInMonth(d.dataPagamento, selectedYear, selectedMonth)),
    [despesas, selectedYear, selectedMonth]
  );
  const monthReceitas = useMemo(
    () => receitas.filter((r) => isMesAnoInMonth(r.mesAno, selectedYear, selectedMonth)),
    [receitas, selectedYear, selectedMonth]
  );
  const monthPagamentos = useMemo(
    () => pagamentos.filter((p) => p.ano === selectedYear && p.mes === selectedMonth + 1),
    [pagamentos, selectedYear, selectedMonth]
  );

  function handleMonthChange(year, month) {
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedGroupKey(null);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [dRes, rRes, pRes, pagRes] = await Promise.all([
        fetch('/api/despesas'),
        fetch('/api/receitas'),
        fetch('/api/poupanca'),
        fetch('/api/pagamentos')
      ]);
      if (!dRes.ok || !rRes.ok || !pRes.ok || !pagRes.ok) throw new Error('Falha ao carregar dados');
      const [dJson, rJson, pJson, pagJson] = await Promise.all([dRes.json(), rRes.json(), pRes.json(), pagRes.json()]);
      setDespesas(dJson.despesas || []);
      setReceitas(rJson.receitas || []);
      setPoupanca(pJson.poupanca || []);
      setPagamentos(pagJson.pagamentos || []);
    } catch (e) {
      setLoadError('Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function handleTabChange(key) {
    setActiveTab(key);
    setSelectedGroupKey(null);
  }

  async function addDespesa(payload) {
    const res = await fetch('/api/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível salvar a despesa.');
    const json = await res.json();
    setDespesas((prev) => [...json.despesas, ...prev]);
  }

  async function addReceita(payload) {
    const res = await fetch('/api/receitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível salvar a receita.');
    const json = await res.json();
    setReceitas((prev) => [json.receita, ...prev]);
  }

  async function addPoupanca(payload) {
    const res = await fetch('/api/poupanca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível salvar o depósito.');
    const json = await res.json();
    setPoupanca((prev) => [json.deposito, ...prev]);
    await refreshDespesas();
  }

  async function refreshDespesas() {
    const res = await fetch('/api/despesas');
    if (!res.ok) return;
    const json = await res.json();
    setDespesas(json.despesas || []);
  }

  async function registrarPagamento(payload) {
    const res = await fetch('/api/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível registrar o pagamento.');
    const [dRes, pagRes] = await Promise.all([fetch('/api/despesas'), fetch('/api/pagamentos')]);
    const [dJson, pagJson] = await Promise.all([dRes.json(), pagRes.json()]);
    setDespesas(dJson.despesas || []);
    setPagamentos(pagJson.pagamentos || []);
  }

  async function editDespesa(id, payload) {
    const res = await fetch('/api/despesas/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível salvar a despesa.');
    const json = await res.json();
    setDespesas((prev) => prev.map((d) => (d.id === id ? json.despesa : d)));
  }

  async function removeDespesa(id) {
    const res = await fetch('/api/despesas/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Não foi possível excluir a despesa.');
    setDespesas((prev) => prev.filter((d) => d.id !== id));
  }

  async function editReceita(id, payload) {
    const res = await fetch('/api/receitas/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível salvar a receita.');
    const json = await res.json();
    setReceitas((prev) => prev.map((r) => (r.id === id ? json.receita : r)));
  }

  async function removeReceita(id) {
    const res = await fetch('/api/receitas/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Não foi possível excluir a receita.');
    setReceitas((prev) => prev.filter((r) => r.id !== id));
  }

  async function editPoupanca(id, payload) {
    const res = await fetch('/api/poupanca/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Não foi possível salvar o depósito.');
    const json = await res.json();
    setPoupanca((prev) => prev.map((p) => (p.id === id ? json.deposito : p)));
    await refreshDespesas();
  }

  async function removePoupanca(id) {
    const res = await fetch('/api/poupanca/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Não foi possível excluir o depósito.');
    setPoupanca((prev) => prev.filter((p) => p.id !== id));
    await refreshDespesas();
  }

  return (
    <div>
      <div className="topbar no-print">
        <div className="brand">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5-5 4 4 9-9"></path>
              <path d="M14 7h7v7"></path>
            </svg>
          </div>
          <div className="brand-name">Controle Larissa</div>
        </div>
        <MonthNav year={selectedYear} month={selectedMonth} onChange={handleMonthChange} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {!reportOpen && <button className="report-link" onClick={() => setReportOpen(true)}>Relatório</button>}
          <button className="logout-btn" onClick={handleLogout}>Sair</button>
        </div>
      </div>

      {!reportOpen && (
        <div className="tabbar-outer no-print">
          <div className="tabbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={'tab-btn' + (activeTab === t.key ? ' active' : '')}
                onClick={() => handleTabChange(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="content">
        {loading ? (
          <div className="card"><div className="loading-state">Carregando seus dados...</div></div>
        ) : loadError ? (
          <div className="card">
            <div className="empty-state">{loadError}</div>
            <div className="form-actions"><button className="btn-primary" onClick={loadAll}>Tentar de novo</button></div>
          </div>
        ) : reportOpen ? (
          <MonthlyReport
            despesas={monthDespesas}
            receitas={monthReceitas}
            year={selectedYear}
            month={selectedMonth}
            onBack={() => setReportOpen(false)}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                despesas={monthDespesas}
                receitas={monthReceitas}
                selectedGroupKey={selectedGroupKey}
                onSelectGroup={setSelectedGroupKey}
              />
            )}
            {activeTab === 'despesas' && (
              <DespesasTab despesas={monthDespesas} onSubmit={addDespesa} onUpdate={editDespesa} onDelete={removeDespesa} />
            )}
            {activeTab === 'receitas' && (
              <ReceitasTab receitas={monthReceitas} onSubmit={addReceita} onUpdate={editReceita} onDelete={removeReceita} />
            )}
            {activeTab === 'poupanca' && (
              <PoupancaTab poupanca={poupanca} onSubmit={addPoupanca} onUpdate={editPoupanca} onDelete={removePoupanca} />
            )}
            {activeTab === 'contas' && (
              <ContasTab
                despesas={monthDespesas}
                pagamentos={monthPagamentos}
                year={selectedYear}
                month={selectedMonth}
                onRegistrarPagamento={registrarPagamento}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
