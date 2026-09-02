import { NextResponse } from 'next/server';
import { updateDespesa, deleteDespesa } from '../../../../lib/db';
import { validateDespesaBody, parseId } from '../../../../lib/validate';

export async function PUT(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'id_invalido' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const result = validateDespesaBody(body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const despesa = await updateDespesa(id, result.value);
    if (!despesa) return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 });
    return NextResponse.json({ despesa });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'id_invalido' }, { status: 400 });

  try {
    await deleteDespesa(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
