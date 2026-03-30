import { supabase } from '@/lib/supabase';
import DocumentacaoView from './DocumentacaoView';

async function buscarEstruturaDocumentacao(documentacaoId) {
  const { data: docs, error: erroDocs } = await supabase
    .from('documentacoes')
    .select('*')
    .eq('id', documentacaoId);

  if (erroDocs) {
    throw new Error(`Erro ao buscar documentação: ${erroDocs.message}`);
  }

  if (!docs || docs.length === 0) {
    throw new Error(`Documentação ${documentacaoId} não encontrada.`);
  }

  const documentacao = docs[0];

  const { data: anexos, error: erroAnexos } = await supabase
    .from('anexos')
    .select('*')
    .eq('documentacao_id', documentacaoId)
    .order('ordem', { ascending: true });

  if (erroAnexos) {
    throw new Error(`Erro ao buscar anexos: ${erroAnexos.message}`);
  }

  const anexosComEstrutura = [];

  for (const anexo of anexos || []) {
    const { data: secoes, error: erroSecoes } = await supabase
      .from('anexo_secoes')
      .select('*')
      .eq('anexo_id', anexo.id)
      .order('ordem', { ascending: true });

    if (erroSecoes) {
      throw new Error(
        `Erro ao buscar seções do anexo ${anexo.id}: ${erroSecoes.message}`
      );
    }

    const secoesComCampos = [];

    for (const secao of secoes || []) {
      const { data: campos, error: erroCampos } = await supabase
        .from('anexo_campos')
        .select('*')
        .eq('secao_id', secao.id)
        .order('ordem', { ascending: true });

      if (erroCampos) {
        throw new Error(
          `Erro ao buscar campos da seção ${secao.id}: ${erroCampos.message}`
        );
      }

      secoesComCampos.push({
        ...secao,
        campos: campos || [],
      });
    }

    anexosComEstrutura.push({
      ...anexo,
      secoes: secoesComCampos,
    });
  }

  return {
    documentacao,
    anexos: anexosComEstrutura,
  };
}

export default async function DocumentacaoPage({ params }) {
  const { id } = await params;
  const documentacaoId = Number(id);

  if (Number.isNaN(documentacaoId)) {
    throw new Error('ID da documentação inválido.');
  }

  const dados = await buscarEstruturaDocumentacao(documentacaoId);

  return <DocumentacaoView dados={dados} />;
}