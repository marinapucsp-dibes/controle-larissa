const { Pool, types } = require('pg');

// Sem isso, o driver converte colunas DATE em objetos Date interpretados no
// fuso do processo, o que pode voltar um dia (ex: '2026-09-15' virando
// 14/09). Mantemos a string 'YYYY-MM-DD' como o Postgres a envia.
types.setTypeParser(1082, (value) => value);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

let pool = null;
function getPool() {
  if (!pool) {
    if (!connectionString) throw new Error('DATABASE_URL não configurada.');
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

// pg usa placeholders $1, $2... em vez de template tag; este helper mínimo
// imita a ergonomia de `sql\`...\`` usada no restante deste arquivo.
function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += '$' + (i + 1) + strings[i + 1];
  }
  return query(text, values);
}

let tablesReady = null;

function ensureTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS despesas (
          id BIGSERIAL PRIMARY KEY,
          tipo TEXT NOT NULL,
          tipo_detalhe TEXT NOT NULL DEFAULT '',
          nome TEXT NOT NULL,
          periodicidade TEXT NOT NULL,
          parcela_atual TEXT NOT NULL DEFAULT '',
          valor NUMERIC(12,2) NOT NULL,
          data_pagamento DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS receitas (
          id BIGSERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          valor NUMERIC(12,2) NOT NULL,
          mes_ano TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS poupanca (
          id BIGSERIAL PRIMARY KEY,
          instituicao TEXT NOT NULL,
          valor NUMERIC(12,2) NOT NULL,
          data_deposito DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS guia (
          id INTEGER PRIMARY KEY,
          dados JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
    })();
  }
  return tablesReady;
}

async function listDespesas() {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM despesas ORDER BY data_pagamento DESC, id DESC`;
  return rows.map(rowToDespesa);
}

async function insertDespesa(d) {
  await ensureTables();
  const { rows } = await sql`
    INSERT INTO despesas (tipo, tipo_detalhe, nome, periodicidade, parcela_atual, valor, data_pagamento)
    VALUES (${d.tipo}, ${d.tipoDetalhe}, ${d.nome}, ${d.periodicidade}, ${d.parcelaAtual}, ${d.valor}, ${d.dataPagamento})
    RETURNING *;
  `;
  return rowToDespesa(rows[0]);
}

function rowToDespesa(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    tipoDetalhe: r.tipo_detalhe,
    nome: r.nome,
    periodicidade: r.periodicidade,
    parcelaAtual: r.parcela_atual,
    valor: Number(r.valor),
    dataPagamento: String(r.data_pagamento).slice(0, 10)
  };
}

async function listReceitas() {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM receitas ORDER BY mes_ano DESC, id DESC`;
  return rows.map(rowToReceita);
}

async function insertReceita(r) {
  await ensureTables();
  const { rows } = await sql`
    INSERT INTO receitas (nome, valor, mes_ano)
    VALUES (${r.nome}, ${r.valor}, ${r.mesAno})
    RETURNING *;
  `;
  return rowToReceita(rows[0]);
}

function rowToReceita(r) {
  return { id: r.id, nome: r.nome, valor: Number(r.valor), mesAno: r.mes_ano };
}

async function listPoupanca() {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM poupanca ORDER BY data_deposito DESC, id DESC`;
  return rows.map(rowToPoupanca);
}

async function insertPoupanca(p) {
  await ensureTables();
  const { rows } = await sql`
    INSERT INTO poupanca (instituicao, valor, data_deposito)
    VALUES (${p.instituicao}, ${p.valor}, ${p.dataDeposito})
    RETURNING *;
  `;
  return rowToPoupanca(rows[0]);
}

function rowToPoupanca(r) {
  return { id: r.id, instituicao: r.instituicao, valor: Number(r.valor), dataDeposito: String(r.data_deposito).slice(0, 10) };
}

async function getGuia() {
  await ensureTables();
  const { rows } = await sql`SELECT dados FROM guia WHERE id = 1`;
  return rows[0] ? rows[0].dados : null;
}

async function saveGuia(dados) {
  await ensureTables();
  await sql`
    INSERT INTO guia (id, dados, updated_at) VALUES (1, ${dados}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, updated_at = now();
  `;
}

module.exports = {
  listDespesas,
  insertDespesa,
  listReceitas,
  insertReceita,
  listPoupanca,
  insertPoupanca,
  getGuia,
  saveGuia
};
