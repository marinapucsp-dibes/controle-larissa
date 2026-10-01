const { Pool, types } = require('pg');
const { monthlyOccurrences } = require('./format');

// Sem isso, o driver converte colunas DATE em objetos Date interpretados no
// fuso do processo, o que pode voltar um dia (ex: '2026-09-15' virando
// 14/09). Mantemos a string 'YYYY-MM-DD' como o Postgres a envia.
types.setTypeParser(1082, (value) => value);

// A integração de banco da Vercel às vezes prefixa as variáveis (ex:
// DATABASE_POSTGRES_URL em vez de DATABASE_URL) dependendo de como o
// "Custom Prefix" foi preenchido na hora de conectar — aceitamos as
// variações mais comuns em vez de depender de um nome exato.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_POSTGRES_URL ||
  process.env.DATABASE_POSTGRES_PRISMA_URL;

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
      // Colunas adicionadas depois da primeira versão - em bancos já
      // existentes isso preenche o que falta sem apagar nada.
      await sql`ALTER TABLE despesas ADD COLUMN IF NOT EXISTS origem_pagamento_id BIGINT;`;
      await sql`ALTER TABLE despesas ADD COLUMN IF NOT EXISTS origem_poupanca_id BIGINT;`;

      await sql`
        CREATE TABLE IF NOT EXISTS receitas (
          id BIGSERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          valor NUMERIC(12,2) NOT NULL,
          mes_ano TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`ALTER TABLE receitas ADD COLUMN IF NOT EXISTS data_recebimento DATE;`;
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
        CREATE TABLE IF NOT EXISTS pagamentos (
          id BIGSERIAL PRIMARY KEY,
          group_tipo TEXT NOT NULL,
          group_detalhe TEXT NOT NULL DEFAULT '',
          ano INTEGER NOT NULL,
          mes INTEGER NOT NULL,
          valor_pago NUMERIC(12,2) NOT NULL,
          data_pagamento DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (group_tipo, group_detalhe, ano, mes)
        );
      `;
      await sql`ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2) NOT NULL DEFAULT 0;`;
      await sql`ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS juros NUMERIC(12,2) NOT NULL DEFAULT 0;`;

      await reconciliarParcelasEmAberto();
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
    INSERT INTO despesas (tipo, tipo_detalhe, nome, periodicidade, parcela_atual, valor, data_pagamento, origem_pagamento_id, origem_poupanca_id)
    VALUES (${d.tipo}, ${d.tipoDetalhe}, ${d.nome}, ${d.periodicidade}, ${d.parcelaAtual || ''}, ${d.valor}, ${d.dataPagamento}, ${d.origemPagamentoId || null}, ${d.origemPoupancaId || null})
    RETURNING *;
  `;
  return rowToDespesa(rows[0]);
}

// Insere várias despesas de uma vez (parcelas/recorrência) numa única
// transação - ou entram todas, ou nenhuma.
async function insertDespesasSeries(list) {
  await ensureTables();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const d of list) {
      const { rows } = await client.query(
        `INSERT INTO despesas (tipo, tipo_detalhe, nome, periodicidade, parcela_atual, valor, data_pagamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
        [d.tipo, d.tipoDetalhe, d.nome, d.periodicidade, d.parcelaAtual || '', d.valor, d.dataPagamento]
      );
      inserted.push(rowToDespesa(rows[0]));
    }
    await client.query('COMMIT');
    return inserted;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updateDespesa(id, d) {
  await ensureTables();
  const { rows } = await sql`
    UPDATE despesas SET tipo=${d.tipo}, tipo_detalhe=${d.tipoDetalhe}, nome=${d.nome}, periodicidade=${d.periodicidade}, parcela_atual=${d.parcelaAtual}, valor=${d.valor}, data_pagamento=${d.dataPagamento}
    WHERE id=${id}
    RETURNING *;
  `;
  return rows[0] ? rowToDespesa(rows[0]) : null;
}

async function deleteDespesa(id) {
  await ensureTables();
  await sql`DELETE FROM despesas WHERE id=${id}`;
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
    INSERT INTO receitas (nome, valor, mes_ano, data_recebimento)
    VALUES (${r.nome}, ${r.valor}, ${r.mesAno}, ${r.dataRecebimento})
    RETURNING *;
  `;
  return rowToReceita(rows[0]);
}

async function updateReceita(id, r) {
  await ensureTables();
  const { rows } = await sql`
    UPDATE receitas SET nome=${r.nome}, valor=${r.valor}, mes_ano=${r.mesAno}, data_recebimento=${r.dataRecebimento}
    WHERE id=${id}
    RETURNING *;
  `;
  return rows[0] ? rowToReceita(rows[0]) : null;
}

async function deleteReceita(id) {
  await ensureTables();
  await sql`DELETE FROM receitas WHERE id=${id}`;
}

function rowToReceita(r) {
  return {
    id: r.id,
    nome: r.nome,
    valor: Number(r.valor),
    mesAno: r.mes_ano,
    dataRecebimento: r.data_recebimento ? String(r.data_recebimento).slice(0, 10) : ''
  };
}

async function listPoupanca() {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM poupanca ORDER BY data_deposito DESC, id DESC`;
  return rows.map(rowToPoupanca);
}

// Todo depósito de poupança também gera uma despesa correspondente (esse
// dinheiro sai da receita disponível no mês) - a despesa fica marcada com
// origem_poupanca_id para poder ser encontrada/atualizada/excluída junto.
async function insertPoupanca(p) {
  await ensureTables();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO poupanca (instituicao, valor, data_deposito) VALUES ($1, $2, $3) RETURNING *;`,
      [p.instituicao, p.valor, p.dataDeposito]
    );
    const deposito = rows[0];
    await client.query(
      `INSERT INTO despesas (tipo, tipo_detalhe, nome, periodicidade, parcela_atual, valor, data_pagamento, origem_poupanca_id)
       VALUES ('Poupança', $1, 'Depósito poupança', 'unica', '', $2, $3, $4);`,
      [p.instituicao, p.valor, p.dataDeposito, deposito.id]
    );
    await client.query('COMMIT');
    return rowToPoupanca(deposito);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updatePoupanca(id, p) {
  await ensureTables();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE poupanca SET instituicao=$1, valor=$2, data_deposito=$3 WHERE id=$4 RETURNING *;`,
      [p.instituicao, p.valor, p.dataDeposito, id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `UPDATE despesas SET tipo_detalhe=$1, valor=$2, data_pagamento=$3 WHERE origem_poupanca_id=$4;`,
      [p.instituicao, p.valor, p.dataDeposito, id]
    );
    await client.query('COMMIT');
    return rowToPoupanca(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deletePoupanca(id) {
  await ensureTables();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM despesas WHERE origem_poupanca_id=$1;`, [id]);
    await client.query(`DELETE FROM poupanca WHERE id=$1;`, [id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function rowToPoupanca(r) {
  return { id: r.id, instituicao: r.instituicao, valor: Number(r.valor), dataDeposito: String(r.data_deposito).slice(0, 10) };
}

async function listAllPagamentos() {
  await ensureTables();
  const { rows } = await sql`SELECT * FROM pagamentos ORDER BY ano DESC, mes DESC, id DESC`;
  return rows.map(rowToPagamento);
}

function rowToPagamento(r) {
  return {
    id: r.id,
    tipo: r.group_tipo,
    tipoDetalhe: r.group_detalhe,
    ano: r.ano,
    mes: r.mes,
    valorPago: Number(r.valor_pago),
    dataPagamento: String(r.data_pagamento).slice(0, 10),
    desconto: Number(r.desconto || 0),
    juros: Number(r.juros || 0)
  };
}

// Registra o pagamento (total ou parcial) de um grupo (tipo+detalhe) num
// mês, e resolve o saldo restante: se sobrar valor a pagar, cria (ou
// atualiza) automaticamente uma despesa "Saldo restante" no mês seguinte;
// se não sobrar nada, remove essa despesa gerada anteriormente, se houver.
// O total devido é recalculado no servidor (soma das despesas do grupo
// naquele mês) em vez de confiar num valor vindo do cliente. Desconto reduz
// o saldo (equivale a já ter pago aquele tanto); juros é um acréscimo que o
// valor pago cobre, sem contar como quitação do valor original da despesa -
// sem isso, um pagamento com desconto sobraria "faltando" e um com juros
// pareceria pagamento a mais (crédito) indevidamente.
async function registrarPagamento({ tipo, tipoDetalhe, ano, mes, valorPago, dataPagamento, desconto, juros }) {
  await ensureTables();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const { rows: totalRows } = await client.query(
      `SELECT COALESCE(SUM(valor), 0) AS total FROM despesas
       WHERE tipo=$1 AND tipo_detalhe=$2
         AND EXTRACT(YEAR FROM data_pagamento)=$3 AND EXTRACT(MONTH FROM data_pagamento)=$4;`,
      [tipo, tipoDetalhe, ano, mes]
    );
    const totalDevido = Number(totalRows[0].total);
    const descontoNum = Number(desconto || 0);
    const jurosNum = Number(juros || 0);

    const { rows } = await client.query(
      `INSERT INTO pagamentos (group_tipo, group_detalhe, ano, mes, valor_pago, data_pagamento, desconto, juros)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (group_tipo, group_detalhe, ano, mes)
       DO UPDATE SET valor_pago=$5, data_pagamento=$6, desconto=$7, juros=$8
       RETURNING *;`,
      [tipo, tipoDetalhe, ano, mes, valorPago, dataPagamento, descontoNum, jurosNum]
    );
    const pagamento = rows[0];
    const restante = Math.round((totalDevido - Number(valorPago) - descontoNum + jurosNum) * 100) / 100;

    const nextDate = nextOccurrenceDate(dataPagamento);

    const { rows: existentes } = await client.query(
      `SELECT id FROM despesas WHERE origem_pagamento_id=$1;`,
      [pagamento.id]
    );

    if (restante > 0.004) {
      if (existentes[0]) {
        await client.query(
          `UPDATE despesas SET valor=$1, data_pagamento=$2, tipo=$3, tipo_detalhe=$4 WHERE id=$5;`,
          [restante, nextDate, tipo, tipoDetalhe, existentes[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO despesas (tipo, tipo_detalhe, nome, periodicidade, parcela_atual, valor, data_pagamento, origem_pagamento_id)
           VALUES ($1, $2, 'Saldo restante', 'unica', '', $3, $4, $5);`,
          [tipo, tipoDetalhe, restante, nextDate, pagamento.id]
        );
      }
    } else if (existentes[0]) {
      await client.query(`DELETE FROM despesas WHERE id=$1;`, [existentes[0].id]);
    }

    await client.query('COMMIT');
    return rowToPagamento(pagamento);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Antes da replicação automática de parcelas existir, cada parcela de uma
// compra em andamento era cadastrada à mão, mês a mês - então compras que já
// estavam em andamento quando essa função foi criada ficaram "paradas" na
// última parcela lançada manualmente. Esta rotina detecta esses casos (um
// grupo de despesas parceladas com o mesmo tipo/detalhe/nome/total de
// parcelas, cuja parcela mais recente ainda não é a última) e gera as
// parcelas restantes de uma vez, a partir do mês seguinte à última já
// lançada - roda automaticamente e não repete lançamentos já existentes.
async function reconciliarParcelasEmAberto() {
  // A Vercel pode atender requisições em várias instâncias do servidor ao
  // mesmo tempo, cada uma rodando ensureTables() do zero - sem um lock, duas
  // instâncias simultâneas podiam ler o mesmo estado "faltando parcelas" e
  // inserir as mesmas parcelas em dobro/triplo. Um advisory lock do Postgres
  // garante que só uma instância por vez execute esta rotina: as outras
  // esperam, e ao continuar já encontram o trabalho feito (nada a fazer).
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(727271);');

    // Remove duplicatas exatas que a corrida acima possa ter criado antes
    // desse lock existir - mantém a linha mais antiga (menor id) de cada
    // grupo idêntico. Idempotente: não encontra nada para apagar depois da
    // primeira vez.
    await client.query(`
      DELETE FROM despesas a USING despesas b
      WHERE a.id > b.id
        AND a.periodicidade = 'parcelado'
        AND a.tipo = b.tipo AND a.tipo_detalhe = b.tipo_detalhe AND a.nome = b.nome
        AND a.periodicidade = b.periodicidade AND a.parcela_atual = b.parcela_atual
        AND a.valor = b.valor AND a.data_pagamento = b.data_pagamento;
    `);

    const { rows } = await client.query(`
      SELECT * FROM despesas
      WHERE periodicidade='parcelado' AND parcela_atual ~ '^[0-9]+/[0-9]+$'
      ORDER BY tipo, tipo_detalhe, nome, data_pagamento;
    `);
    const despesas = rows.map(rowToDespesa);

    const groups = {};
    despesas.forEach((d) => {
      const [xStr, yStr] = d.parcelaAtual.split('/');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      if (!Number.isInteger(x) || !Number.isInteger(y) || y < 2) return;
      const key = [d.tipo, d.tipoDetalhe, d.nome, y].join('|');
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...d, parcelaX: x, parcelaY: y });
    });

    const toInsert = [];
    Object.values(groups).forEach((list) => {
      list.sort((a, b) => a.parcelaX - b.parcelaX);
      const last = list[list.length - 1];
      if (last.parcelaX >= last.parcelaY) return;
      const missingCount = last.parcelaY - last.parcelaX;
      const nextDates = monthlyOccurrences(nextOccurrenceDate(last.dataPagamento), missingCount);
      nextDates.forEach((dataPagamento, i) => {
        const parcelaNum = last.parcelaX + 1 + i;
        toInsert.push({
          tipo: last.tipo,
          tipoDetalhe: last.tipoDetalhe,
          nome: last.nome,
          periodicidade: 'parcelado',
          parcelaAtual: parcelaNum + '/' + last.parcelaY,
          valor: last.valor,
          dataPagamento
        });
      });
    });

    for (const d of toInsert) {
      await client.query(
        `INSERT INTO despesas (tipo, tipo_detalhe, nome, periodicidade, parcela_atual, valor, data_pagamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [d.tipo, d.tipoDetalhe, d.nome, d.periodicidade, d.parcelaAtual, d.valor, d.dataPagamento]
      );
    }

    await client.query('COMMIT');
    return toInsert.length;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function nextOccurrenceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const monthIndex0 = (m - 1) + 1;
  const year = y + Math.floor(monthIndex0 / 12);
  const month1 = (monthIndex0 % 12) + 1;
  const daysInMonth = new Date(year, month1, 0).getDate();
  const day = Math.min(d, daysInMonth);
  return year + '-' + String(month1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

module.exports = {
  listDespesas,
  insertDespesa,
  insertDespesasSeries,
  updateDespesa,
  deleteDespesa,
  listReceitas,
  insertReceita,
  updateReceita,
  deleteReceita,
  listPoupanca,
  insertPoupanca,
  updatePoupanca,
  deletePoupanca,
  listAllPagamentos,
  registrarPagamento
};
