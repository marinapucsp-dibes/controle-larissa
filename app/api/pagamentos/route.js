import { NextResponse } from 'next/server';
import { listAllPagamentos, registrarPagamento } from '../../../lib/db';
import { validatePagamentoBody } from '../../../lib/validate';

export async function GET() {
  try {
    const pagamentos = await listAllPagamentos();
    return NextResponse.json({ pagamentos });
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

  const result = validatePagamentoBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const pagamento = await registrarPagamento(result.value);
    return NextResponse.json({ pagamento }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
