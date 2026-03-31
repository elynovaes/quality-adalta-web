'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { EmptyState, PageHeader, PageShell, SurfaceCard } from '@/components/ui';

export default function DocumentacaoView({ dados }) {
  const router = useRouter();
  const [loadingAnexoId, setLoadingAnexoId] = useState(null);

  async function criarSecao(anexo) {
    const nome = window.prompt('Nome da nova seção');

    if (!nome || !nome.trim()) return;

    try {
      setLoadingAnexoId(anexo.id);

      const { error } = await supabase.from('anexo_secoes').insert([
        {
          anexo_id: anexo.id,
          nome: nome.trim(),
          ordem: (anexo.secoes?.length || 0) + 1,
          ativo: true,
        },
      ]);

      if (error) {
        alert(`Erro ao criar seção: ${error.message}`);
        return;
      }

      router.refresh();
    } finally {
      setLoadingAnexoId(null);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Documentação"
        title={dados.documentacao.titulo}
        description="Estrutura da documentação com anexos, seções e campos já cadastrados para consulta e manutenção."
        meta={
          <>
            <span className="badge badge--primary">{dados.documentacao.categoria}</span>
            <span className="badge">{dados.documentacao.tipo}</span>
            <span className="badge">{dados.anexos.length} anexos</span>
          </>
        }
      />

      {dados.anexos.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="Nenhum anexo encontrado"
            description="Esta documentação ainda não possui anexos vinculados."
          />
        </SurfaceCard>
      ) : (
        <div className="anexo-list">
          {dados.anexos.map((anexo) => (
            <SurfaceCard key={anexo.id}>
              <div className="surface-card__header">
                <div>
                  <h2 className="surface-card__title">{anexo.nome}</h2>
                  <p className="surface-card__subtitle">
                    {anexo.descricao || 'Sem descrição cadastrada para este anexo.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => criarSecao(anexo)}
                  disabled={loadingAnexoId === anexo.id}
                >
                  {loadingAnexoId === anexo.id ? 'Criando...' : 'Nova seção'}
                </button>
              </div>

              {anexo.secoes.length === 0 ? (
                <EmptyState
                  title="Nenhuma seção encontrada"
                  description="Use a ação acima para adicionar a primeira seção deste anexo."
                />
              ) : (
                <div className="section-list">
                  {anexo.secoes.map((secao) => (
                    <div key={secao.id} className="section-panel">
                      <div className="cluster">
                        <span className="badge badge--primary">{secao.nome}</span>
                        <span className="badge">
                          {secao.campos.length} {secao.campos.length === 1 ? 'campo' : 'campos'}
                        </span>
                      </div>

                      {secao.campos.length === 0 ? (
                        <p className="muted">Nenhum campo nesta seção.</p>
                      ) : (
                        <ul className="bullet-list">
                          {secao.campos.map((campo) => (
                            <li key={campo.id}>
                              <span>
                                {campo.label} <span className="muted">({campo.tipo})</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
