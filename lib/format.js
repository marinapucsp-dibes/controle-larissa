const GROUP_PALETTE = ['#5A79E0', '#E0A548', '#4FAEB5', '#B270C9', '#D9739E', '#9B9A93', '#C98B5A', '#7D8CC4'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function currentMonthISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function formatBRL(n) {
  n = Number(n) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
  let intPart = parts[0];
  let out = '';
  while (intPart.length > 3) {
    out = '.' + intPart.slice(-3) + out;
    intPart = intPart.slice(0, -3);
  }
  out = intPart + out;
  return sign + 'R$ ' + out + ',' + parts[1];
}

function hexTint(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0');
  return '#' + mix(r) + mix(g) + mix(b);
}

function formatDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dia = String(d.getDate()).padStart(2, '0');
  return dia + ' ' + MESES_ABREV[d.getMonth()];
}

function formatMesAnoLabel(mesAno) {
  const parts = mesAno.split('-');
  const ano = parts[0];
  const mesIdx = parseInt(parts[1], 10) - 1;
  return MESES[mesIdx] + ' de ' + ano;
}

function periodicidadeLabel(d) {
  if (d.periodicidade === 'parcelado') return 'Parcelado (' + d.parcelaAtual + ')';
  if (d.periodicidade === 'recorrente') return 'Recorrente';
  return 'Parcela única';
}

function groupKeyOf(d) {
  return d.tipo + '|' + d.tipoDetalhe;
}

// `iso` is a 'YYYY-MM-DD' date; `year`/`month` are a real Date's getFullYear()/getMonth() (month 0-11).
function isDateInMonth(iso, year, month) {
  const [y, m] = iso.split('-').map(Number);
  return y === year && m - 1 === month;
}

// `mesAno` is a 'YYYY-MM' string; `year`/`month` are a real Date's getFullYear()/getMonth() (month 0-11).
function isMesAnoInMonth(mesAno, year, month) {
  const [y, m] = mesAno.split('-').map(Number);
  return y === year && m - 1 === month;
}

module.exports = {
  GROUP_PALETTE,
  MONTH_NAMES,
  todayISO,
  currentMonthISO,
  formatBRL,
  hexTint,
  formatDateLabel,
  formatMesAnoLabel,
  periodicidadeLabel,
  groupKeyOf,
  isDateInMonth,
  isMesAnoInMonth
};
