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
  let sistemas = [];

  try {
    const { data: vinculos, error: erroVinculos } = await supabase
      .from('documentacao_sistemas')
      .select('sistema_id')
      .eq('documentacao_id', documentacaoId);

    if (erroVinculos) {
      throw erroVinculos;
    }

    const sistemaIds = (vinculos || []).map((item) => item.sistema_id);

    if (sistemaIds.length > 0) {
      const { data: sistemasData, error: erroSistemas } = await supabase
        .from('sistemas')
        .select('id, nome')
        .in('id', sistemaIds);

      if (erroSistemas) {
        throw new Error(`Erro ao buscar sistemas da documentação: ${erroSistemas.message}`);
      }

      sistemas = sistemasData || [];
    }
  } catch (error) {
    if (documentacao.sistema_id) {
      const { data: sistemaData, error: erroSistema } = await supabase
        .from('sistemas')
        .select('id, nome')
        .eq('id', documentacao.sistema_id)
        .maybeSingle();

      if (erroSistema) {
        throw new Error(`Erro ao buscar sistema da documentação: ${erroSistema.message}`);
      }

      sistemas = sistemaData ? [sistemaData] : [];
    } else {
      console.log(error);
    }
  }

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
    sistemas,
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
