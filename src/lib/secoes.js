export async function criarSecao(anexoId, nome, ordem) {
  const { data, error } = await supabase
    .from('anexo_secoes')
    .insert([
      {
        anexo_id: anexoId,
        nome: nome,
        ordem: ordem,
        ativo: true,
      },
    ])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}