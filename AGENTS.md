<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Regras do projeto

## Banco de dados
- O projeto usa Supabase
- O cliente está em src/lib/supabase.js

## Tabelas principais
- documentacoes
- anexo_secoes
- anexo_campos
- anexo_respostas

## Fluxo de salvamento
1. cria ou identifica a documentacao
2. busca as seções do anexo
3. busca os campos de cada seção
4. salva respostas em anexo_respostas
5. ao reabrir, carrega respostas existentes por documentacao_id

## Regras importantes
- não duplicar respostas do mesmo campo para a mesma documentação
- preservar estrutura atual das rotas
- não alterar a lógica visual sem necessidade
- manter funções de banco separadas da UI
