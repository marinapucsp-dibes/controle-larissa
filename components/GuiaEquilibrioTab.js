'use client';

import { useEffect, useRef, useState } from 'react';
import { defaultGuia } from '../lib/guiaDefaults';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function GuiaEquilibrioTab({ dados, onSave }) {
  const [guia, setGuia] = useState(dados);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    setGuia(dados);
  }, [dados]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSave(guia);
        setStatus('saved');
      } catch (e) {
        setStatus('error');
      }
    }, 900);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guia]);

  function update(patch) {
    setGuia((g) => ({ ...g, ...patch }));
  }

  function updateListItem(field, index, value) {
    setGuia((g) => {
      const list = g[field].slice();
      list[index] = value;
      return { ...g, [field]: list };
    });
  }

  function updateTableCell(field, index, key, value) {
    setGuia((g) => {
      const list = g[field].map((row, i) => (i === index ? { ...row, [key]: value } : row));
      return { ...g, [field]: list };
    });
  }

  function toggleRotina(rowIndex, dayIndex) {
    setGuia((g) => {
      const rotina = g.rotina.map((row, i) => {
        if (i !== rowIndex) return row;
        const dias = row.dias.slice();
        dias[dayIndex] = !dias[dayIndex];
        return { ...row, dias };
      });
      return { ...g, rotina };
    });
  }

  function limpar() {
    if (!confirm('Limpar todos os campos preenchidos e desmarcar as caixas?')) return;
    setGuia(defaultGuia());
  }

  const statusLabel = { idle: '', saving: 'Salvando...', saved: 'Salvo', error: 'Erro ao salvar' }[status];

  return (
    <div className="geq-wrap">
      <div className="geq-toolbar no-print">
        <span className={'geq-status geq-status-' + status}>{statusLabel}</span>
        <button className="btn-secondary" onClick={limpar}>Limpar campos</button>
        <button className="btn-primary" onClick={() => window.print()}>Imprimir / Salvar em PDF</button>
      </div>

      <div className="geq-page">
        <input className="geq-title" value={guia.titulo} onChange={(e) => update({ titulo: e.target.value })} />
        <input className="geq-subtitle" value={guia.subtitulo} onChange={(e) => update({ subtitulo: e.target.value })} />

        <div className="geq-grid3">
          <section className="geq-card">
            <div className="geq-head">🧠 Fase 1 - Autoconhecimento e Alerta</div>
            <div className="geq-body">
              <h3>Identifique seus Gatilhos</h3>
              <p>Situações que precedem crises: privação de sono, conflitos interpessoais, uso de substâncias, mudanças bruscas na rotina.</p>
              <textarea
                className="geq-area"
                placeholder="Escreva aqui os gatilhos que você identifica em si."
                value={guia.gatilhos}
                onChange={(e) => update({ gatilhos: e.target.value })}
              />

              <div className="geq-section-title">Sinais de Alerta: Mania/Hipomania x Depressão</div>
              <div className="geq-two">
                <div>
                  <label>↑ Mania / Hipomania</label>
                  <div className="geq-lines">
                    {guia.maniaSinais.map((v, i) => (
                      <input key={i} type="text" placeholder="Ex.: fala mais rápida" value={v} onChange={(e) => updateListItem('maniaSinais', i, e.target.value)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label>↓ Depressão</label>
                  <div className="geq-lines">
                    {guia.depressaoSinais.map((v, i) => (
                      <input key={i} type="text" placeholder="Ex.: isolamento" value={v} onChange={(e) => updateListItem('depressaoSinais', i, e.target.value)} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="geq-section-title">✎ Outros sinais importantes que observo</div>
              <textarea
                className="geq-area"
                placeholder="Sinais físicos, comportamentais, emocionais ou outros padrões que você percebe em si."
                value={guia.outrosSinais}
                onChange={(e) => update({ outrosSinais: e.target.value })}
              />
            </div>
          </section>

          <section className="geq-card">
            <div className="geq-head">🤝 Fase 2 - Planejamento e Acordos Preventivos</div>
            <div className="geq-body">
              <h3>Acordos comigo e com outros</h3>
              <p>Registre acordos importantes para me ajudar nos momentos de vulnerabilidade.</p>
              <table className="geq-table">
                <thead><tr><th>Acordo</th><th>Com quem</th><th>Contato</th></tr></thead>
                <tbody>
                  {guia.acordos.map((row, i) => (
                    <tr key={i}>
                      <td><input value={row.acordo} onChange={(e) => updateTableCell('acordos', i, 'acordo', e.target.value)} /></td>
                      <td><input value={row.comQuem} onChange={(e) => updateTableCell('acordos', i, 'comQuem', e.target.value)} /></td>
                      <td><input value={row.contato} onChange={(e) => updateTableCell('acordos', i, 'contato', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ marginTop: 10 }}>♡ Minha Rede de Apoio</h3>
              <p>Pessoas que posso procurar quando precisar.</p>
              <table className="geq-table">
                <thead><tr><th>Nome</th><th>Relação</th><th>Contato</th></tr></thead>
                <tbody>
                  {guia.rede.map((row, i) => (
                    <tr key={i}>
                      <td><input value={row.nome} onChange={(e) => updateTableCell('rede', i, 'nome', e.target.value)} /></td>
                      <td><input value={row.relacao} onChange={(e) => updateTableCell('rede', i, 'relacao', e.target.value)} /></td>
                      <td><input value={row.contato} onChange={(e) => updateTableCell('rede', i, 'contato', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="geq-emergency">
                <div className="geq-phone">188</div>
                <div>
                  <strong>Apoio Emergencial CVV</strong>
                  <p>Risco à segurança ou suporte emocional 24h no Brasil — cvv.org.br</p>
                </div>
              </div>
            </div>
          </section>

          <section className="geq-card geq-green">
            <div className="geq-head">🧘 Fase 3 - Manutenção e Exercícios Diários</div>
            <div className="geq-body">
              <div className="geq-exercise">
                <strong>Exercício Respiratório 4-7-8</strong>
                <p>Reduzir ansiedade e agitação.</p>
                <div className="geq-breath">
                  <div><div className="geq-bubble" />4s</div>
                  <div><div className="geq-bubble" />7s</div>
                  <div><div className="geq-bubble geq-bubble-green" />8s</div>
                  <div><div className="geq-bubble geq-bubble-icon">↻</div>4x</div>
                </div>
              </div>
              <div className="geq-exercise">
                <strong>Relaxamento Muscular Progressivo</strong>
                <p>Tensione e solte grupos musculares dos pés ao rosto para liberar tensão.</p>
              </div>
              <div className="geq-exercise">
                <strong>Mindfulness e Observação</strong>
                <p>Observe sem julgamento 3 sons, 3 coisas que vê e 3 sensações corporais para ancorar-se no presente.</p>
              </div>
              <div className="geq-exercise">
                <strong>Outras estratégias que funcionam para mim</strong>
                <textarea
                  className="geq-area"
                  placeholder="Ex.: tomar banho, caminhar, ouvir música, reduzir estímulos, pedir ajuda..."
                  value={guia.outrasEstrategias}
                  onChange={(e) => update({ outrasEstrategias: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="geq-bottom">
          <section className="geq-card">
            <div className="geq-body" style={{ padding: '7px 8px' }}>
              <table className="geq-table geq-routine">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>📅 Meta de Rotina Semanal</th>
                    {DIAS.map((d) => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {guia.rotina.map((row, ri) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {row.dias.map((checked, di) => (
                        <td key={di}>
                          <input type="checkbox" checked={checked} onChange={() => toggleRotina(ri, di)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="geq-card">
            <div className="geq-body" style={{ padding: 8 }}>
              <div className="geq-section-title" style={{ marginTop: 0 }}>Observações / Reflexões da Semana</div>
              <textarea
                className="geq-area geq-notes"
                placeholder="Registre mudanças de humor, situações importantes, dúvidas para levar ao profissional, conquistas ou dificuldades."
                value={guia.observacoes}
                onChange={(e) => update({ observacoes: e.target.value })}
              />
            </div>
          </section>
        </div>

        <input className="geq-footer" value={guia.rodape} onChange={(e) => update({ rodape: e.target.value })} />
      </div>

      <style jsx>{`
        .geq-wrap { --geq-azul: #dceaf7; --geq-azul2: #bfd4e8; --geq-verde: #dcebdc; --geq-verde2: #bfd6c2; --geq-linha: #aebdca; }
        .geq-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .geq-status { font-size: 13px; font-weight: 700; color: #6B685F; min-width: 70px; }
        .geq-status-error { color: #D14343; }
        .geq-status-saved { color: #2E9E5B; }

        .geq-page {
          background: linear-gradient(135deg, #f9fcff, #f3f8fa);
          border: 1px solid #E7E4DD;
          border-radius: 16px;
          padding: 20px 22px;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }
        .geq-title, .geq-subtitle, .geq-footer {
          display: block; width: 100%; text-align: center; border: none; background: transparent;
          font-family: Arial, Helvetica, sans-serif; color: #172033;
        }
        .geq-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
        .geq-subtitle { font-size: 13px; margin-bottom: 14px; }
        .geq-footer { font-size: 12px; font-weight: 700; margin-top: 12px; }

        .geq-grid3 { display: grid; grid-template-columns: 1fr 1.05fr 1fr; gap: 12px; }
        .geq-card { border: 1.5px solid var(--geq-linha); border-radius: 16px; background: #fff; overflow: hidden; }
        .geq-head { padding: 9px 12px; font-size: 15px; font-weight: 800; background: linear-gradient(90deg, var(--geq-azul2), var(--geq-azul)); }
        .geq-green .geq-head { background: linear-gradient(90deg, var(--geq-verde2), var(--geq-verde)); }
        .geq-body { padding: 12px 14px; }
        .geq-body h3 { font-size: 14px; margin: 6px 0; }
        .geq-body p { font-size: 12px; line-height: 1.4; margin: 4px 0 8px; }
        .geq-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .geq-section-title { font-weight: 800; font-size: 13px; margin: 10px 0 5px; }
        .geq-body label { font-size: 11px; font-weight: 700; }
        .geq-lines input {
          width: 100%; border: none; border-bottom: 1px solid #8ca3b7; background: transparent;
          padding: 5px 2px; font-size: 12px; outline: none; margin-bottom: 4px; font-family: inherit;
        }
        .geq-area {
          width: 100%; min-height: 52px; resize: vertical; border: 1px solid #b9c7d2; border-radius: 8px;
          padding: 7px; background: #fbfdff; font-size: 12px; font-family: inherit;
        }
        .geq-notes { min-height: 130px; }

        .geq-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; margin-top: 4px; }
        .geq-table th, .geq-table td { border: 1px solid #b9c7d2; padding: 5px 6px; vertical-align: middle; }
        .geq-table th { background: #dfeaf1; font-weight: 800; }
        .geq-table input {
          border: none !important; width: 100%; padding: 1px !important; font-size: 11.5px !important;
          background: transparent !important; font-family: inherit; outline: none;
        }
        .geq-emergency {
          display: grid; grid-template-columns: 60px 1fr; gap: 8px; align-items: center;
          margin-top: 10px; padding-top: 8px; border-top: 1px solid #d6e0e7;
        }
        .geq-phone { font-size: 20px; font-weight: 900; text-align: center; }

        .geq-exercise { border-bottom: 1px solid #dfe6e9; padding: 5px 0 8px; margin-bottom: 6px; }
        .geq-exercise:last-child { border-bottom: none; }
        .geq-exercise strong { font-size: 12px; }
        .geq-breath { display: flex; gap: 10px; justify-content: space-between; text-align: center; font-size: 10px; margin-top: 6px; }
        .geq-bubble { width: 26px; height: 26px; border-radius: 50%; background: #cbdce8; margin: auto auto 3px; }
        .geq-bubble-green { background: #d5e5d2; }
        .geq-bubble-icon { background: transparent; font-size: 17px; line-height: 26px; }

        .geq-bottom { display: grid; grid-template-columns: 2.2fr 1fr; gap: 12px; margin-top: 12px; }
        .geq-routine td:first-child { font-size: 11px; }
        .geq-routine th:not(:first-child), .geq-routine td:not(:first-child) { text-align: center; width: 6%; }

        @media (max-width: 900px) {
          .geq-grid3 { grid-template-columns: 1fr; }
          .geq-bottom { grid-template-columns: 1fr; }
          .geq-two { grid-template-columns: 1fr; }
        }

        @media print {
          .geq-page { border: none; border-radius: 0; box-shadow: none; padding: 0; }
        }
      `}</style>
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
    </div>
  );
}
