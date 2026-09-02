import { NextResponse } from 'next/server';
import { listDespesas, insertDespesa } from '../../../lib/db';
import { validateDespesaBody } from '../../../lib/validate';

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

  const result = validateDespesaBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const despesa = await insertDespesa(result.value);
    return NextResponse.json({ despesa }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
