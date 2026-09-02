import { NextResponse } from 'next/server';
import { updateReceita, deleteReceita } from '../../../../lib/db';
import { validateReceitaBody, parseId } from '../../../../lib/validate';

export async function PUT(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'id_invalido' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const result = validateReceitaBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const receita = await updateReceita(id, result.value);
    if (!receita) return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 });
    return NextResponse.json({ receita });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'id_invalido' }, { status: 400 });

  try {
    await deleteReceita(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
