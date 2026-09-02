import { NextResponse } from 'next/server';
import { getGuia, saveGuia } from '../../../lib/db';

export async function GET() {
  try {
    const dados = await getGuia();
    return NextResponse.json({ dados });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}

export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'dados_invalidos' }, { status: 400 });
  }

  try {
    await saveGuia(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
