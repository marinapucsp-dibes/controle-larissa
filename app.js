(function () {
  'use strict';

  var STORAGE_KEY = 'controle-larissa-state-v1';
  var GROUP_PALETTE = ['#5A79E0', '#E0A548', '#4FAEB5', '#B270C9', '#D9739E', '#9B9A93', '#C98B5A', '#7D8CC4'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // ---------- helpers ----------

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function currentMonthISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function formatBRL(n) {
    n = Number(n) || 0;
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    var parts = abs.toFixed(2).split('.');
    var intPart = parts[0];
    var out = '';
    while (intPart.length > 3) {
      out = '.' + intPart.slice(-3) + out;
      intPart = intPart.slice(0, -3);
    }
    out = intPart + out;
    return sign + 'R$ ' + out + ',' + parts[1];
  }

  function hexTint(hex, amount) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    function mix(c) { return Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0'); }
    return '#' + mix(r) + mix(g) + mix(b);
  }

  function formatDateLabel(iso) {
    var d = new Date(iso + 'T00:00:00');
    var dia = String(d.getDate()).padStart(2, '0');
    return dia + ' ' + MESES_ABREV[d.getMonth()];
  }

  function formatMesAnoLabel(mesAno) {
    var parts = mesAno.split('-');
    var ano = parts[0];
    var mesIdx = parseInt(parts[1], 10) - 1;
    return MESES[mesIdx] + ' de ' + ano;
  }

  function periodicidadeLabel(d) {
    if (d.periodicidade === 'parcelado') return 'Parcelado (' + esc(d.parcelaAtual) + ')';
    if (d.periodicidade === 'recorrente') return 'Recorrente';
    return 'Parcela única';
  }

  function groupKeyOf(d) {
    return d.tipo + '|' + d.tipoDetalhe;
  }

  // ---------- state ----------

  var defaultData = { despesas: [], receitas: [], poupanca: [], activeTab: 'dashboard' };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaultData);
      var parsed = JSON.parse(raw);
      return {
        despesas: Array.isArray(parsed.despesas) ? parsed.despesas : [],
        receitas: Array.isArray(parsed.receitas) ? parsed.receitas : [],
        poupanca: Array.isArray(parsed.poupanca) ? parsed.poupanca : [],
        activeTab: parsed.activeTab || 'dashboard'
      };
    } catch (e) {
      return Object.assign({}, defaultData);
    }
  }

  function saveState() {
    var toSave = {
      despesas: state.despesas,
      receitas: state.receitas,
      poupanca: state.poupanca,
      activeTab: state.activeTab
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch (e) { /* storage unavailable */ }
  }

  var state = loadState();

  var ui = {
    selectedGroupKey: null,
    despesaForm: { tipo: 'Cartão de Crédito', tipoDetalhe: '', nome: '', periodicidade: 'unica', parcelaAtual: '', valor: '', dataPagamento: todayISO() },
    receitaForm: { nome: 'Salário', nomeCustom: '', valor: '', mesAno: currentMonthISO() },
    poupancaForm: { instituicao: '', valor: '', data: todayISO() }
  };

  // ---------- derived data ----------

  function computeGroups() {
    var groupMap = {};
    var order = [];
    state.despesas.forEach(function (d) {
      var key = groupKeyOf(d);
      if (!groupMap[key]) {
        groupMap[key] = { key: key, tipo: d.tipo, tipoDetalhe: d.tipoDetalhe, total: 0, count: 0 };
        order.push(key);
      }
      groupMap[key].total += d.valor;
      groupMap[key].count += 1;
    });
    var list = order.map(function (k) { return groupMap[k]; }).sort(function (a, b) { return b.total - a.total; });
    var colorByKey = {};
    list.forEach(function (g, i) { colorByKey[g.key] = GROUP_PALETTE[i % GROUP_PALETTE.length]; });
    return { groupMap: groupMap, list: list, colorByKey: colorByKey };
  }

  // ---------- render ----------

  function render() {
    var root = document.getElementById('root');
    root.innerHTML = renderApp();
    bindEvents();
  }

  function renderApp() {
    var tabs = [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'despesas', label: 'Despesas' },
      { key: 'receitas', label: 'Receitas' },
      { key: 'poupanca', label: 'Poupança' }
    ];

    var tabBtns = tabs.map(function (t) {
      var active = state.activeTab === t.key ? ' active' : '';
      return '<button class="tab-btn' + active + '" data-tab="' + t.key + '">' + t.label + '</button>';
    }).join('');

    var content = '';
    if (state.activeTab === 'dashboard') content = renderDashboard();
    else if (state.activeTab === 'despesas') content = renderDespesas();
    else if (state.activeTab === 'receitas') content = renderReceitas();
    else content = renderPoupanca();

    return (
      '<div class="topbar">' +
        '<div class="brand">' +
          '<div class="brand-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 9-9"></path><path d="M14 7h7v7"></path></svg></div>' +
          '<div class="brand-name">Controle Larissa</div>' +
        '</div>' +
      '</div>' +
      '<div class="tabbar-outer"><div class="tabbar">' + tabBtns + '</div></div>' +
      '<div class="content">' + content + '</div>'
    );
  }

  function renderDashboard() {
    var income = state.receitas.reduce(function (s, t) { return s + t.valor; }, 0);
    var expense = state.despesas.reduce(function (s, t) { return s + t.valor; }, 0);
    var balance = income - expense;
    var maxBar = Math.max(income, expense) || 1;
    var incomePct = Math.round((income / maxBar) * 100);
    var expensePct = Math.round((expense / maxBar) * 100);

    var g = computeGroups();

    var rightPanel;
    if (ui.selectedGroupKey && g.groupMap[ui.selectedGroupKey]) {
      var grp = g.groupMap[ui.selectedGroupKey];
      var label = esc(grp.tipo + (grp.tipoDetalhe ? ' · ' + grp.tipoDetalhe : ''));
      var entries = state.despesas
        .filter(function (d) { return groupKeyOf(d) === ui.selectedGroupKey; })
        .slice()
        .sort(function (a, b) { return new Date(b.dataPagamento) - new Date(a.dataPagamento); });

      var rows = entries.map(function (d) {
        return (
          '<div class="tx-row">' +
            '<div class="tx-info">' +
              '<div class="tx-desc">' + esc(d.nome) + '</div>' +
              '<div class="tx-meta">' + periodicidadeLabel(d) + ' · ' + formatDateLabel(d.dataPagamento) + '</div>' +
            '</div>' +
            '<div class="tx-value negative">' + formatBRL(d.valor) + '</div>' +
          '</div>'
        );
      }).join('') || '<div class="empty-state">Nenhum lançamento neste grupo.</div>';

      rightPanel = (
        '<div class="detail-header"><button class="back-btn" data-action="clear-group">← Voltar</button><h2>' + label + '</h2></div>' +
        '<div class="tx-list">' + rows + '</div>'
      );
    } else if (g.list.length) {
      var cards = g.list.map(function (grp) {
        var label = esc(grp.tipo + (grp.tipoDetalhe ? ' · ' + grp.tipoDetalhe : ''));
        var color = g.colorByKey[grp.key];
        return (
          '<button class="group-card" data-group-key="' + esc(grp.key) + '">' +
            '<div class="group-card-top"><span class="group-dot" style="background:' + color + '"></span><span class="group-count">' + grp.count + ' lançamento(s)</span></div>' +
            '<div class="group-label">' + label + '</div>' +
            '<div class="group-total" style="color:' + color + '">' + formatBRL(grp.total) + '</div>' +
          '</button>'
        );
      }).join('');
      rightPanel = '<h2>Despesas por tipo</h2><div class="group-grid">' + cards + '</div>';
    } else {
      rightPanel = '<h2>Despesas por tipo</h2><div class="empty-state">Nenhuma despesa cadastrada ainda.</div>';
    }

    return (
      '<div class="summary-grid">' +
        '<div class="card"><p class="summary-label">Saldo</p><p class="summary-value" style="color:' + (balance >= 0 ? '#2E9E5B' : '#D14343') + '">' + formatBRL(balance) + '</p></div>' +
        '<div class="card"><p class="summary-label">Receitas</p><p class="summary-value positive">' + formatBRL(income) + '</p></div>' +
        '<div class="card"><p class="summary-label">Despesas</p><p class="summary-value negative">' + formatBRL(expense) + '</p></div>' +
      '</div>' +
      '<div class="main-grid">' +
        '<div class="card"><h2>Receitas x despesas</h2><div class="bar-chart">' +
          '<div><div class="bar-row-head"><span>Receitas</span><span class="positive">' + formatBRL(income) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + incomePct + '%; background:#2E9E5B"></div></div></div>' +
          '<div><div class="bar-row-head"><span>Despesas</span><span class="negative">' + formatBRL(expense) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + expensePct + '%; background:#D14343"></div></div></div>' +
        '</div></div>' +
        '<div class="card">' + rightPanel + '</div>' +
      '</div>'
    );
  }

  function renderDespesas() {
    var form = ui.despesaForm;
    var g = computeGroups();

    var tipos = ['Cartão de Crédito', 'Empréstimo', 'Boleto', 'Terceiros'];
    var tipoPills = tipos.map(function (t) {
      var active = form.tipo === t ? ' active' : '';
      return '<button class="pill-btn' + active + '" data-tipo="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');

    var periods = [{ k: 'unica', l: 'Parcela única' }, { k: 'parcelado', l: 'Parcelado' }, { k: 'recorrente', l: 'Recorrente' }];
    var periodPills = periods.map(function (p) {
      var active = form.periodicidade === p.k ? ' active' : '';
      return '<button class="pill-btn' + active + '" data-period="' + p.k + '">' + p.l + '</button>';
    }).join('');

    var extraField = '';
    if (form.tipo === 'Cartão de Crédito') {
      extraField = '<label class="field"><span>Nome do cartão</span><input type="text" id="despesaDetalhe" value="' + esc(form.tipoDetalhe) + '" placeholder="Ex: Nubank" /></label>';
    } else if (form.tipo === 'Empréstimo') {
      extraField = '<label class="field"><span>Nome do banco</span><input type="text" id="despesaDetalhe" value="' + esc(form.tipoDetalhe) + '" placeholder="Ex: Banco do Brasil" /></label>';
    }

    var parcelaField = form.periodicidade === 'parcelado'
      ? '<label class="field"><span>Parcela atual</span><input type="text" id="despesaParcela" value="' + esc(form.parcelaAtual) + '" placeholder="Ex: 1/6" /></label>'
      : '';

    var list = state.despesas.slice().sort(function (a, b) { return new Date(b.dataPagamento) - new Date(a.dataPagamento); });
    var rows = list.map(function (d) {
      var key = groupKeyOf(d);
      var color = g.colorByKey[key] || '#9B9A93';
      var initialSrc = d.tipoDetalhe && d.tipoDetalhe.length ? d.tipoDetalhe : d.tipo;
      var tipoLabel = esc(d.tipo + (d.tipoDetalhe ? ' · ' + d.tipoDetalhe : ''));
      return (
        '<div class="tx-row">' +
          '<div class="tx-icon" style="background:' + hexTint(color, 0.82) + '"><span class="tx-icon-letter" style="color:' + color + '">' + esc(initialSrc.charAt(0).toUpperCase()) + '</span></div>' +
          '<div class="tx-info"><div class="tx-desc">' + esc(d.nome) + '</div><div class="tx-meta">' + tipoLabel + ' · ' + periodicidadeLabel(d) + ' · ' + formatDateLabel(d.dataPagamento) + '</div></div>' +
          '<div class="tx-value negative">' + formatBRL(d.valor) + '</div>' +
        '</div>'
      );
    }).join('') || '<div class="empty-state">Nenhuma despesa cadastrada ainda.</div>';

    return (
      '<div class="stack">' +
        '<div class="card">' +
          '<h2>Nova despesa</h2>' +
          '<div class="field-label">Tipo</div><div class="pill-grid-4">' + tipoPills + '</div>' +
          extraField +
          '<label class="field"><span>Nome da despesa</span><input type="text" id="despesaNome" value="' + esc(form.nome) + '" placeholder="Ex: Supermercado" /></label>' +
          '<div class="field-label">Periodicidade</div><div class="pill-grid-3">' + periodPills + '</div>' +
          parcelaField +
          '<div class="field-row">' +
            '<label class="field"><span>Valor</span><input type="number" min="0" step="0.01" id="despesaValor" value="' + esc(form.valor) + '" placeholder="0,00" /></label>' +
            '<label class="field"><span>Data do pagamento</span><input type="date" id="despesaData" value="' + esc(form.dataPagamento) + '" /></label>' +
          '</div>' +
          '<div class="form-actions"><button class="btn-primary" id="submitDespesaBtn" disabled>Adicionar despesa</button></div>' +
        '</div>' +
        '<div class="card"><h2>Despesas cadastradas</h2><div class="tx-list">' + rows + '</div></div>' +
      '</div>'
    );
  }

  function renderReceitas() {
    var form = ui.receitaForm;
    var nomes = ['Salário', 'Vale', 'Outro'];
    var pills = nomes.map(function (n) {
      var active = form.nome === n ? ' active' : '';
      return '<button class="pill-btn' + active + '" data-recnome="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');

    var outroField = form.nome === 'Outro'
      ? '<label class="field"><span>Nome</span><input type="text" id="receitaNomeCustom" value="' + esc(form.nomeCustom) + '" placeholder="Ex: Bônus" /></label>'
      : '';

    var list = state.receitas.slice().sort(function (a, b) { return (b.mesAno > a.mesAno ? 1 : -1) || (b.id - a.id); });
    var rows = list.map(function (r) {
      return (
        '<div class="tx-row">' +
          '<div class="tx-icon" style="background:' + hexTint('#2E9E5B', 0.85) + '"><span class="tx-icon-letter" style="color:#2E9E5B">' + esc(r.nome.charAt(0).toUpperCase()) + '</span></div>' +
          '<div class="tx-info"><div class="tx-desc">' + esc(r.nome) + '</div><div class="tx-meta">' + formatMesAnoLabel(r.mesAno) + '</div></div>' +
          '<div class="tx-value positive">' + formatBRL(r.valor) + '</div>' +
        '</div>'
      );
    }).join('') || '<div class="empty-state">Nenhuma receita cadastrada ainda.</div>';

    return (
      '<div class="stack">' +
        '<div class="card">' +
          '<h2>Nova receita</h2>' +
          '<div class="field-label">Nome</div><div class="pill-grid-3">' + pills + '</div>' +
          outroField +
          '<div class="field-row">' +
            '<label class="field"><span>Valor</span><input type="number" min="0" step="0.01" id="receitaValor" value="' + esc(form.valor) + '" placeholder="0,00" /></label>' +
            '<label class="field"><span>Mês e ano</span><input type="month" id="receitaMesAno" value="' + esc(form.mesAno) + '" /></label>' +
          '</div>' +
          '<div class="form-actions"><button class="btn-primary" id="submitReceitaBtn" disabled>Adicionar receita</button></div>' +
        '</div>' +
        '<div class="card"><h2>Receitas cadastradas</h2><div class="tx-list">' + rows + '</div></div>' +
      '</div>'
    );
  }

  function renderPoupanca() {
    var form = ui.poupancaForm;
    var total = state.poupanca.reduce(function (s, t) { return s + t.valor; }, 0);
    var list = state.poupanca.slice().sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
    var rows = list.map(function (p) {
      return (
        '<div class="tx-row">' +
          '<div class="tx-icon" style="background:' + hexTint('#2E9E5B', 0.85) + '"><span class="tx-icon-letter" style="color:#2E9E5B">' + esc(p.instituicao.charAt(0).toUpperCase()) + '</span></div>' +
          '<div class="tx-info"><div class="tx-desc">' + esc(p.instituicao) + '</div><div class="tx-meta">' + formatDateLabel(p.data) + '</div></div>' +
          '<div class="tx-value positive">' + formatBRL(p.valor) + '</div>' +
        '</div>'
      );
    }).join('') || '<div class="empty-state">Nenhum depósito cadastrado ainda.</div>';

    return (
      '<div class="stack">' +
        '<div class="card">' +
          '<h2>Novo depósito</h2>' +
          '<div class="field-row">' +
            '<label class="field"><span>Instituição</span><input type="text" id="poupancaInstituicao" value="' + esc(form.instituicao) + '" placeholder="Ex: Nubank Caixinha" /></label>' +
            '<label class="field"><span>Data do depósito</span><input type="date" id="poupancaData" value="' + esc(form.data) + '" /></label>' +
          '</div>' +
          '<label class="field"><span>Valor</span><input type="number" min="0" step="0.01" id="poupancaValor" value="' + esc(form.valor) + '" placeholder="0,00" /></label>' +
          '<div class="form-actions"><button class="btn-primary" id="submitPoupancaBtn" disabled>Adicionar depósito</button></div>' +
        '</div>' +
        '<div class="card"><p class="summary-label">Total guardado</p><p class="summary-value positive">' + formatBRL(total) + '</p></div>' +
        '<div class="card"><h2>Depósitos</h2><div class="tx-list">' + rows + '</div></div>' +
      '</div>'
    );
  }

  // ---------- validation (used both to toggle buttons live and to gate submit) ----------

  function despesaValid() {
    var f = ui.despesaForm;
    var needsDetalhe = f.tipo === 'Cartão de Crédito' || f.tipo === 'Empréstimo';
    if (!f.nome || !(parseFloat(f.valor) > 0) || !f.dataPagamento) return false;
    if (needsDetalhe && !f.tipoDetalhe) return false;
    if (f.periodicidade === 'parcelado' && !f.parcelaAtual) return false;
    return true;
  }

  function receitaValid() {
    var f = ui.receitaForm;
    var nome = f.nome === 'Outro' ? f.nomeCustom : f.nome;
    return !!nome && parseFloat(f.valor) > 0 && !!f.mesAno;
  }

  function poupancaValid() {
    var f = ui.poupancaForm;
    return !!f.instituicao && parseFloat(f.valor) > 0 && !!f.data;
  }

  // ---------- events ----------

  function bindEvents() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeTab = btn.dataset.tab;
        ui.selectedGroupKey = null;
        saveState();
        render();
      });
    });

    document.querySelectorAll('[data-group-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.selectedGroupKey = btn.dataset.groupKey;
        render();
      });
    });
    var clearBtn = document.querySelector('[data-action="clear-group"]');
    if (clearBtn) clearBtn.addEventListener('click', function () { ui.selectedGroupKey = null; render(); });

    // ---- despesas form ----
    document.querySelectorAll('[data-tipo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.despesaForm.tipo = btn.dataset.tipo;
        ui.despesaForm.tipoDetalhe = '';
        render();
      });
    });
    document.querySelectorAll('[data-period]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.despesaForm.periodicidade = btn.dataset.period;
        ui.despesaForm.parcelaAtual = '';
        render();
      });
    });
    bindText('despesaDetalhe', function (v) { ui.despesaForm.tipoDetalhe = v; }, updateDespesaBtn);
    bindText('despesaNome', function (v) { ui.despesaForm.nome = v; }, updateDespesaBtn);
    bindText('despesaParcela', function (v) { ui.despesaForm.parcelaAtual = v; }, updateDespesaBtn);
    bindText('despesaValor', function (v) { ui.despesaForm.valor = v; }, updateDespesaBtn);
    bindText('despesaData', function (v) { ui.despesaForm.dataPagamento = v; }, updateDespesaBtn);
    updateDespesaBtn();
    var submitDespesaBtn = document.getElementById('submitDespesaBtn');
    if (submitDespesaBtn) submitDespesaBtn.addEventListener('click', submitDespesa);

    // ---- receitas form ----
    document.querySelectorAll('[data-recnome]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.receitaForm.nome = btn.dataset.recnome;
        render();
      });
    });
    bindText('receitaNomeCustom', function (v) { ui.receitaForm.nomeCustom = v; }, updateReceitaBtn);
    bindText('receitaValor', function (v) { ui.receitaForm.valor = v; }, updateReceitaBtn);
    bindText('receitaMesAno', function (v) { ui.receitaForm.mesAno = v; }, updateReceitaBtn);
    updateReceitaBtn();
    var submitReceitaBtn = document.getElementById('submitReceitaBtn');
    if (submitReceitaBtn) submitReceitaBtn.addEventListener('click', submitReceita);

    // ---- poupança form ----
    bindText('poupancaInstituicao', function (v) { ui.poupancaForm.instituicao = v; }, updatePoupancaBtn);
    bindText('poupancaData', function (v) { ui.poupancaForm.data = v; }, updatePoupancaBtn);
    bindText('poupancaValor', function (v) { ui.poupancaForm.valor = v; }, updatePoupancaBtn);
    updatePoupancaBtn();
    var submitPoupancaBtn = document.getElementById('submitPoupancaBtn');
    if (submitPoupancaBtn) submitPoupancaBtn.addEventListener('click', submitPoupanca);
  }

  function bindText(id, setter, onUpdate) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      setter(el.value);
      onUpdate();
    });
  }

  function updateDespesaBtn() {
    var btn = document.getElementById('submitDespesaBtn');
    if (btn) btn.disabled = !despesaValid();
  }
  function updateReceitaBtn() {
    var btn = document.getElementById('submitReceitaBtn');
    if (btn) btn.disabled = !receitaValid();
  }
  function updatePoupancaBtn() {
    var btn = document.getElementById('submitPoupancaBtn');
    if (btn) btn.disabled = !poupancaValid();
  }

  function submitDespesa() {
    if (!despesaValid()) return;
    var f = ui.despesaForm;
    state.despesas = [{
      id: Date.now(),
      tipo: f.tipo,
      tipoDetalhe: f.tipoDetalhe,
      nome: f.nome,
      periodicidade: f.periodicidade,
      parcelaAtual: f.parcelaAtual,
      valor: parseFloat(String(f.valor).replace(',', '.')),
      dataPagamento: f.dataPagamento
    }].concat(state.despesas);
    ui.despesaForm = { tipo: 'Cartão de Crédito', tipoDetalhe: '', nome: '', periodicidade: 'unica', parcelaAtual: '', valor: '', dataPagamento: f.dataPagamento };
    saveState();
    render();
  }

  function submitReceita() {
    if (!receitaValid()) return;
    var f = ui.receitaForm;
    var nome = f.nome === 'Outro' ? f.nomeCustom.trim() : f.nome;
    state.receitas = [{
      id: Date.now(),
      nome: nome,
      valor: parseFloat(String(f.valor).replace(',', '.')),
      mesAno: f.mesAno
    }].concat(state.receitas);
    ui.receitaForm = { nome: 'Salário', nomeCustom: '', valor: '', mesAno: f.mesAno };
    saveState();
    render();
  }

  function submitPoupanca() {
    if (!poupancaValid()) return;
    var f = ui.poupancaForm;
    state.poupanca = [{
      id: Date.now(),
      instituicao: f.instituicao,
      valor: parseFloat(String(f.valor).replace(',', '.')),
      data: f.data
    }].concat(state.poupanca);
    ui.poupancaForm = { instituicao: '', valor: '', data: f.data };
    saveState();
    render();
  }

  // ---------- init ----------

  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support optional */ });
    });
  }
})();
