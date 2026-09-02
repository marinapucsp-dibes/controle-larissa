import { NextResponse } from 'next/server';
import { listPoupanca, insertPoupanca } from '../../../lib/db';

export async function GET() {
  try {
    const poupanca = await listPoupanca();
    return NextResponse.json({ poupanca });
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

  const instituicao = typeof body.instituicao === 'string' ? body.instituicao.trim() : '';
  const valor = Number(body.valor);
  const dataDeposito = typeof body.dataDeposito === 'string' ? body.dataDeposito : '';

  if (!instituicao) return NextResponse.json({ error: 'instituicao_obrigatoria' }, { status: 400 });
  if (!(valor > 0)) return NextResponse.json({ error: 'valor_invalido' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataDeposito)) return NextResponse.json({ error: 'data_invalida' }, { status: 400 });

  try {
    const deposito = await insertPoupanca({ instituicao, valor, dataDeposito });
    return NextResponse.json({ deposito }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
