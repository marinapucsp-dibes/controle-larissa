import { NextResponse } from 'next/server';
import { listDespesas, insertDespesa } from '../../../lib/db';

const TIPOS_VALIDOS = ['Cartão de Crédito', 'Empréstimo', 'Boleto', 'Terceiros'];
const PERIODICIDADES_VALIDAS = ['unica', 'parcelado', 'recorrente'];

export async function GET() {
  try {
    const despesas = await listDespesas();
    return NextResponse.json({ despesas });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const tipo = body.tipo;
  const tipoDetalhe = typeof body.tipoDetalhe === 'string' ? body.tipoDetalhe.trim() : '';
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const periodicidade = body.periodicidade;
  const parcelaAtual = typeof body.parcelaAtual === 'string' ? body.parcelaAtual.trim() : '';
  const valor = Number(body.valor);
  const dataPagamento = typeof body.dataPagamento === 'string' ? body.dataPagamento : '';

  if (!TIPOS_VALIDOS.includes(tipo)) return NextResponse.json({ error: 'tipo_invalido' }, { status: 400 });
  if (!PERIODICIDADES_VALIDAS.includes(periodicidade)) return NextResponse.json({ error: 'periodicidade_invalida' }, { status: 400 });
  if (!nome) return NextResponse.json({ error: 'nome_obrigatorio' }, { status: 400 });
  if (!(valor > 0)) return NextResponse.json({ error: 'valor_invalido' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) return NextResponse.json({ error: 'data_invalida' }, { status: 400 });
  const needsDetalhe = tipo === 'Cartão de Crédito' || tipo === 'Empréstimo';
  if (needsDetalhe && !tipoDetalhe) return NextResponse.json({ error: 'detalhe_obrigatorio' }, { status: 400 });
  if (periodicidade === 'parcelado' && !parcelaAtual) return NextResponse.json({ error: 'parcela_obrigatoria' }, { status: 400 });

  try {
    const despesa = await insertDespesa({
      tipo,
      tipoDetalhe: needsDetalhe ? tipoDetalhe : '',
      nome,
      periodicidade,
      parcelaAtual: periodicidade === 'parcelado' ? parcelaAtual : '',
      valor,
      dataPagamento
    });
    return NextResponse.json({ despesa }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
