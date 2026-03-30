'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
    <main style={{ padding: '24px' }}>
      <h1>{dados.documentacao.titulo}</h1>

      <p>
        <strong>Categoria:</strong> {dados.documentacao.categoria}
      </p>

      <p>
        <strong>Tipo:</strong> {dados.documentacao.tipo}
      </p>

      {dados.anexos.length === 0 ? (
        <p>Nenhum anexo encontrado para esta documentação.</p>
      ) : (
        dados.anexos.map((anexo) => (
          <section
            key={anexo.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <h2>{anexo.nome}</h2>
                <p>{anexo.descricao}</p>
              </div>

              <button
                type="button"
                style={{
                  padding: '6px 12px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => criarSecao(anexo)}
                disabled={loadingAnexoId === anexo.id}
              >
                {loadingAnexoId === anexo.id ? 'Criando...' : '+ Nova Seção'}
              </button>
            </div>

            {anexo.secoes.length === 0 ? (
              <p>Nenhuma seção encontrada neste anexo.</p>
            ) : (
              anexo.secoes.map((secao) => (
                <div
                  key={secao.id}
                  style={{
                    marginTop: '16px',
                    paddingLeft: '16px',
                    borderLeft: '3px solid #ddd',
                  }}
                >
                  <h3>{secao.nome}</h3>

                  {secao.campos.length === 0 ? (
                    <p>Nenhum campo nesta seção.</p>
                  ) : (
                    <ul>
                      {secao.campos.map((campo) => (
                        <li key={campo.id}>
                          {campo.label} ({campo.tipo})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </section>
        ))
      )}
    </main>
  );
}