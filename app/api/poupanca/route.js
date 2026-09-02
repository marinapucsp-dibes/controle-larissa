import { NextResponse } from 'next/server';
import { listPoupanca, insertPoupanca } from '../../../lib/db';
import { validatePoupancaBody } from '../../../lib/validate';

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

  const result = validatePoupancaBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const deposito = await insertPoupanca(result.value);
    return NextResponse.json({ deposito }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
