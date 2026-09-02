// Estrutura padrão (vazia) do "Guia de Equilíbrio". Uma função geradora é
// usada em vez de uma constante para que cada chamada retorne um objeto novo,
// evitando mutação acidental de um estado compartilhado.
function defaultGuia() {
  return {
    titulo: 'Meu Guia de Equilíbrio: Plano de Organização e Gestão para o Transtorno Bipolar',
    subtitulo: 'Ferramenta de apoio para autoconhecimento e plano de ação, complementando o acompanhamento profissional.',
    gatilhos: '',
    maniaSinais: ['', '', '', '', ''],
    depressaoSinais: ['', '', '', '', ''],
    outrosSinais: '',
    acordos: [
      { acordo: '', comQuem: '', contato: '' },
      { acordo: '', comQuem: '', contato: '' },
      { acordo: '', comQuem: '', contato: '' },
      { acordo: '', comQuem: '', contato: '' }
    ],
    rede: [
      { nome: '', relacao: '', contato: '' },
      { nome: '', relacao: '', contato: '' },
      { nome: '', relacao: '', contato: '' }
    ],
    outrasEstrategias: '',
    rotina: [
      { label: 'Sono Regular (Dormir/Acordar)', dias: [false, false, false, false, false, false, false] },
      { label: 'Refeições Regulares', dias: [false, false, false, false, false, false, false] },
      { label: 'Medicação conforme Prescrição', dias: [false, false, false, false, false, false, false] },
      { label: 'Atividade Física (Meta: 150 min/sem)', dias: [false, false, false, false, false, false, false] },
      { label: 'Contato Social', dias: [false, false, false, false, false, false, false] }
    ],
    observacoes: '',
    rodape: 'Este guia é seu aliado. Use, ajuste e personalize sempre que precisar.'
  };
}

module.exports = { defaultGuia };
