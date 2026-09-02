import { NextResponse } from 'next/server';
import { listReceitas, insertReceita } from '../../../lib/db';

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

  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const valor = Number(body.valor);
  const mesAno = typeof body.mesAno === 'string' ? body.mesAno : '';

  if (!nome) return NextResponse.json({ error: 'nome_obrigatorio' }, { status: 400 });
  if (!(valor > 0)) return NextResponse.json({ error: 'valor_invalido' }, { status: 400 });
  if (!/^\d{4}-\d{2}$/.test(mesAno)) return NextResponse.json({ error: 'mes_ano_invalido' }, { status: 400 });

  try {
    const receita = await insertReceita({ nome, valor, mesAno });
    return NextResponse.json({ receita }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'db_error', message: String(e && e.message) }, { status: 500 });
  }
}
