const TIPOS_VALIDOS = ['Cartão de Crédito', 'Empréstimo', 'Boleto', 'Terceiros'];
const PERIODICIDADES_VALIDAS = ['unica', 'parcelado', 'recorrente'];

function needsDetalheFor(tipo) {
  return tipo === 'Cartão de Crédito' || tipo === 'Empréstimo' || tipo === 'Terceiros';
}

function validateCommonDespesaFields(body) {
  const tipo = body.tipo;
  const tipoDetalhe = typeof body.tipoDetalhe === 'string' ? body.tipoDetalhe.trim() : '';
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const periodicidade = body.periodicidade;
  const valor = Number(body.valor);
  const dataPagamento = typeof body.dataPagamento === 'string' ? body.dataPagamento : '';

  if (!TIPOS_VALIDOS.includes(tipo)) return { error: 'tipo_invalido' };
  if (!PERIODICIDADES_VALIDAS.includes(periodicidade)) return { error: 'periodicidade_invalida' };
  if (!nome) return { error: 'nome_obrigatorio' };
  if (!(valor > 0)) return { error: 'valor_invalido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) return { error: 'data_invalida' };
  const needsDetalhe = needsDetalheFor(tipo);
  if (needsDetalhe && !tipoDetalhe) return { error: 'detalhe_obrigatorio' };

  return { value: { tipo, tipoDetalhe: needsDetalhe ? tipoDetalhe : '', nome, periodicidade, valor, dataPagamento } };
}

// Used to edit a single already-existing row: periodicidade is descriptive
// here (parcela_atual is free text, e.g. "2/6"), it never regenerates a
// series.
function validateDespesaBody(body) {
  const common = validateCommonDespesaFields(body);
  if (common.error) return common;
  const parcelaAtual = typeof body.parcelaAtual === 'string' ? body.parcelaAtual.trim() : '';
  if (common.value.periodicidade === 'parcelado' && !parcelaAtual) return { error: 'parcela_obrigatoria' };
  return { value: { ...common.value, parcelaAtual: common.value.periodicidade === 'parcelado' ? parcelaAtual : '' } };
}

// Used to create a new despesa: 'parcelado' takes a total installment count
// instead of free text - the caller generates one row per month from this.
function validateDespesaCreateBody(body) {
  const common = validateCommonDespesaFields(body);
  if (common.error) return common;
  if (common.value.periodicidade === 'parcelado') {
    const parcelaTotal = parseInt(body.parcelaTotal, 10);
    if (!Number.isInteger(parcelaTotal) || parcelaTotal < 2 || parcelaTotal > 60) {
      return { error: 'parcela_total_invalida' };
    }
    return { value: { ...common.value, parcelaTotal } };
  }
  return { value: common.value };
}

function validateReceitaBody(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const valor = Number(body.valor);
  const mesAno = typeof body.mesAno === 'string' ? body.mesAno : '';

  if (!nome) return { error: 'nome_obrigatorio' };
  if (!(valor > 0)) return { error: 'valor_invalido' };
  if (!/^\d{4}-\d{2}$/.test(mesAno)) return { error: 'mes_ano_invalido' };

  return { value: { nome, valor, mesAno } };
}

function validatePoupancaBody(body) {
  const instituicao = typeof body.instituicao === 'string' ? body.instituicao.trim() : '';
  const valor = Number(body.valor);
  const dataDeposito = typeof body.dataDeposito === 'string' ? body.dataDeposito : '';

  if (!instituicao) return { error: 'instituicao_obrigatoria' };
  if (!(valor > 0)) return { error: 'valor_invalido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataDeposito)) return { error: 'data_invalida' };

  return { value: { instituicao, valor, dataDeposito } };
}

function validatePagamentoBody(body) {
  const tipo = typeof body.tipo === 'string' ? body.tipo : '';
  const tipoDetalhe = typeof body.tipoDetalhe === 'string' ? body.tipoDetalhe : '';
  const ano = parseInt(body.ano, 10);
  const mes = parseInt(body.mes, 10);
  const valorPago = Number(body.valorPago);
  const dataPagamento = typeof body.dataPagamento === 'string' ? body.dataPagamento : '';

  if (!tipo) return { error: 'tipo_obrigatorio' };
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return { error: 'ano_invalido' };
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { error: 'mes_invalido' };
  if (!(valorPago > 0)) return { error: 'valor_invalido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) return { error: 'data_invalida' };

  return { value: { tipo, tipoDetalhe, ano, mes, valorPago, dataPagamento } };
}

function parseId(raw) {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = {
  validateDespesaBody,
  validateDespesaCreateBody,
  validateReceitaBody,
  validatePoupancaBody,
  validatePagamentoBody,
  parseId
};
