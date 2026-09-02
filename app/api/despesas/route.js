import { NextResponse } from 'next/server';
import { listDespesas, insertDespesa, insertDespesasSeries } from '../../../lib/db';
import { validateDespesaCreateBody } from '../../../lib/validate';
import { monthlyOccurrences } from '../../../lib/format';

const RECORRENTE_MESES = 12;

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

  const result = validateDespesaCreateBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  const v = result.value;

  try {
    if (v.periodicidade === 'unica') {
      const despesa = await insertDespesa({ ...v, parcelaAtual: '' });
      return NextResponse.json({ despesas: [despesa] }, { status: 201 });
    }

    const count = v.periodicidade === 'parcelado' ? v.parcelaTotal : RECORRENTE_MESES;
    const dates = monthlyOccurrences(v.dataPagamento, count);
    const rows = dates.map((dataPagamento, i) => ({
      tipo: v.tipo,
      tipoDetalhe: v.tipoDetalhe,
      nome: v.nome,
      periodicidade: v.periodicidade,
      parcelaAtual: v.periodicidade === 'parcelado' ? (i + 1) + '/' + v.parcelaTotal : '',
      valor: v.valor,
      dataPagamento
    }));
    const despesas = await insertDespesasSeries(rows);
    return NextResponse.json({ despesas }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
