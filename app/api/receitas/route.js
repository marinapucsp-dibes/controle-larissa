import { NextResponse } from 'next/server';
import { listReceitas, insertReceita } from '../../../lib/db';
import { validateReceitaBody } from '../../../lib/validate';

export async function GET() {
  try {
    const receitas = await listReceitas();
    return NextResponse.json({ receitas });
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

  const result = validateReceitaBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const receita = await insertReceita(result.value);
    return NextResponse.json({ receita }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
