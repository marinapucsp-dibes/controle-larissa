const TIPOS_VALIDOS = ['Cartão de Crédito', 'Empréstimo', 'Boleto', 'Terceiros'];
const PERIODICIDADES_VALIDAS = ['unica', 'parcelado', 'recorrente'];

function validateDespesaBody(body) {
  const tipo = body.tipo;
  const tipoDetalhe = typeof body.tipoDetalhe === 'string' ? body.tipoDetalhe.trim() : '';
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const periodicidade = body.periodicidade;
  const parcelaAtual = typeof body.parcelaAtual === 'string' ? body.parcelaAtual.trim() : '';
  const valor = Number(body.valor);
  const dataPagamento = typeof body.dataPagamento === 'string' ? body.dataPagamento : '';

  if (!TIPOS_VALIDOS.includes(tipo)) return { error: 'tipo_invalido' };
  if (!PERIODICIDADES_VALIDAS.includes(periodicidade)) return { error: 'periodicidade_invalida' };
  if (!nome) return { error: 'nome_obrigatorio' };
  if (!(valor > 0)) return { error: 'valor_invalido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) return { error: 'data_invalida' };
  const needsDetalhe = tipo === 'Cartão de Crédito' || tipo === 'Empréstimo';
  if (needsDetalhe && !tipoDetalhe) return { error: 'detalhe_obrigatorio' };
  if (periodicidade === 'parcelado' && !parcelaAtual) return { error: 'parcela_obrigatoria' };

  return {
    value: {
      tipo,
      tipoDetalhe: needsDetalhe ? tipoDetalhe : '',
      nome,
      periodicidade,
      parcelaAtual: periodicidade === 'parcelado' ? parcelaAtual : '',
      valor,
      dataPagamento
    }
  };
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

function parseId(raw) {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validateDespesaBody, validateReceitaBody, validatePoupancaBody, parseId };
