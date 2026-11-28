# Suits

Sistema para gestão de aluguel de trajes, reservas, ajustes de costura, pagamentos, devoluções e lavanderia.

## Tecnologias

Next.js 16, React 19, TypeScript, Tailwind CSS 4 e PostgreSQL. Suporte a instalação como PWA e temas claro e escuro.

## Executar com dados de demonstração

Requer Node.js 22 ou superior.

```sh
npm install
npm run dev:demo
```

Abra o endereço exibido no terminal, normalmente `http://127.0.0.1:3001`. O comando inicia um PostgreSQL local sem exigir configuração de `DATABASE_URL`.

Todas as contas abaixo usam a senha `Suits123!`:

| Perfil | CPF |
| --- | --- |
| Administrador | 123.456.789-10 |
| Costureira | 111.222.333-44 |
| Cliente | 987.654.321-00 |

É possível cadastrar novos clientes. Os dados são preservados entre execuções. No Windows, ficam em `%LOCALAPPDATA%/Suits/demo-postgres-18`; nos demais sistemas, em `~/.local/share/suits/demo-postgres-18`.

Pressione `Ctrl+C` para encerrar. O modo de demonstração não modifica os arquivos de ambiente nem acessa o banco configurado para produção.

## Configurar o banco

Copie `.env.example` para `.env.local` e configure `DATABASE_URL` com a conexão PostgreSQL. Para conexões remotas, utilize as opções TLS fornecidas pelo provedor.

```sh
npm install
npm run db:init
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`. As migrações também são aplicadas no primeiro acesso ao banco.

O arquivo `seeds.sql` contém dados de exemplo para desenvolvimento, com senha `senha123`. Sua execução é manual e deve ocorrer apenas em uma base de testes.

Para cadastrar ou atualizar uma costureira, defina `USER_CPF`, `USER_NAME` e `USER_PASSWORD` no ambiente e execute `node create-costureira-user.js`.

## Publicar na Vercel com Neon

1. Crie um projeto PostgreSQL no Neon e importe este repositório na Vercel. Use a URL de conexão PostgreSQL com SSL; o endpoint com pooler é apropriado para a aplicação serverless.
2. Em **Vercel → Project → Settings → Environment Variables**, configure `DATABASE_URL` com a URL do Neon e `APP_ORIGIN` com a origem pública canônica, sem barra final, por exemplo `https://seu-projeto.vercel.app`. Habilite as variáveis para **Production**. Não coloque credenciais no código nem no Git.
3. Faça o deploy. As migrações são aplicadas automaticamente na primeira conexão ao banco. O projeto não cria contas administrativas ou dados de demonstração nesse processo.
4. Antes de liberar o site, crie o primeiro administrador. Em uma máquina confiável, coloque temporariamente `DATABASE_URL`, `ADMIN_CPF`, `ADMIN_NAME` e `ADMIN_PASSWORD` em `.env.local` (arquivo ignorado pelo Git) e execute `npm run admin:init`. A senha deve ter ao menos 12 caracteres. O comando aplica as migrações e só cria a conta se ainda não houver administrador; não substitui nem altera contas existentes. Apague as credenciais temporárias de `.env.local` ao terminar.
5. Teste o login administrativo e os fluxos necessários. Compartilhe o domínio canônico configurado em `APP_ORIGIN`. Para usar domínio próprio, atualize `APP_ORIGIN` para essa origem e faça novo deploy. Use uma base separada para previews e testes; não conecte previews a dados reais.

Não use as contas e senhas do modo de demonstração em produção. Rotacione qualquer senha ou URL de banco que tenha sido compartilhada ou publicada.

Para popular intencionalmente um banco Neon de apresentação com contas e dados fictícios, configure a URL atual do Neon em `.env.local` e execute `npm run seed:presentation -- --confirm-demo-data`. O comando só aceita conexão TLS local com o banco `neondb` em um host Neon; a rotina é idempotente e nunca é executada pela Vercel durante o deploy. As contas de demonstração usam a senha `Suits123!`; qualquer pessoa com o link poderá entrar como administrador. Use exclusivamente para apresentação com dados fictícios e apague essas contas ao encerrar a demonstração.

## Funcionalidades

- **Administrador:** inventário, atendimento presencial, solicitações online, acompanhamento da costura, pagamentos, devoluções, medidas, calendário, manutenção, alertas e relatórios.
- **Costureira:** ajustes atribuídos, atualização do andamento, prazos de retirada e avaliações dos clientes vinculados aos seus ajustes ativos.
- **Cliente:** cadastro, catálogo, recomendações de trajes, solicitações de reserva, acompanhamento, histórico, perfil, consulta de medidas e avisos.
- Tutorial opcional por perfil, disponível pelo botão **Ajuda**.
- Relatórios de utilização dos trajes com exportação CSV.

## Reservas e disponibilidade

O cliente consulta as datas e envia uma solicitação para análise. A solicitação bloqueia o período até aprovação, recusa ou cancelamento. A aprovação confirma a reserva, sem cobrança automática.

Cada registro de inventário representa uma peça física. A disponibilidade considera retirada, devolução, preparação, higienização, manutenção e operações atrasadas. Os dias de retirada e devolução pertencem ao período reservado.

Os prazos de preparação e higienização são configurados por traje em **Operações**. A preparação pode começar na janela configurada; a retirada deve ocorrer dentro do período reservado. A conclusão da lavanderia exige confirmação do administrador.

As datas utilizam o fuso `America/Sao_Paulo`. O plano diário vence no mesmo dia e o semanal em sete dias. Recebimentos são registrados manualmente; o QR exibido é uma referência interna, sem integração bancária.

## Recomendações e medidas

Em **Operações**, o administrador informa eventos, estilos e medidas reais de cada traje. No catálogo, o cliente pode ordenar as peças pela compatibilidade com suas preferências, orçamento, tamanho e medidas profissionais disponíveis.

Os pesos ficam em `lib/recommendations.ts`. A comparação corporal utiliza a avaliação mais recente e as medidas cadastradas do traje. Quando faltam medidas, os demais critérios continuam disponíveis. A recomendação não substitui a avaliação de caimento pela alfaiataria.

Em **Medidas**, cada avaliação registra data e profissional, preservando as anteriores. Clientes podem consultar apenas suas próprias medidas. Costureiras acessam somente clientes dos ajustes ativos atribuídos a elas.

## Provador Virtual

Na área do cliente, o Provador Virtual pode ser acessado pela página inicial ou pelos detalhes de um traje. No fluxo de geração, a pessoa seleciona uma foto própria e autoriza explicitamente o envio ao Space `yisol/IDM-VTON`, no Hugging Face. A aplicação reduz a foto no dispositivo, aceita arquivos JPG/PNG/WEBP de até 3 MB, limita as gerações a uma por minuto por cliente e não persiste a foto nem o resultado. O provedor recebe as imagens e aplica sua própria política de processamento e retenção; o resultado é retransmitido para exibição temporária na tela, sem ser guardado pelo Suits. O recurso exige conexão com a internet, pode levar até 60 segundos e pode ficar indisponível quando o Space estiver ocupado.

No registro demonstrativo `demo-history` (Smoking Peak), o botão usa uma simulação de apresentação com uma imagem pré-gerada após cinco segundos. Essa simulação é identificada na tela, não pede nem envia uma foto pessoal e não representa uma prova virtual personalizada. As imagens do manequim e do modelo ficam em `public/demo-tryon/`.

**Licença:** o Space `yisol/IDM-VTON` declara licença CC-BY-NC-SA-4.0, de uso não comercial. Habilite esta integração somente em demonstrações acadêmicas não comerciais; para oferecer o provador em uma operação comercial, obtenha autorização ou substitua o modelo por um provedor com licença comercial compatível.

O token Hugging Face é opcional para a cota pública. Para usar um token de leitura, configure `HF_TOKEN` no `.env.local` e nas variáveis de ambiente da Vercel. Nunca cole o token no código, no Git ou em mensagens. A prévia é ilustrativa, prioriza a parte superior do traje e não representa garantia de caimento, cor ou tamanho.

## Segurança e notificações

As sessões utilizam cookies HttpOnly e expiração no servidor. APIs e páginas verificam autenticação, perfil e propriedade dos dados. Senhas são armazenadas com scrypt.

Cadastros com contatos semelhantes a clientes existentes exigem conferência de identidade pelo administrador antes de liberar histórico e medidas.

Os avisos internos incluem alterações de status, retirada e devolução. São atualizados ao consultar os dados; não há envio externo de mensagens ou notificações push.

O PWA mantém recursos estáticos e a página offline em cache. Páginas autenticadas e APIs exigem conexão e não são armazenadas no cache persistente.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Desenvolvimento com banco configurado |
| `npm run dev:demo` | Desenvolvimento com dados locais de demonstração |
| `npm run build` | Compilação de produção |
| `npm run start` | Servidor de produção |
| `npm run db:init` | Inicialização e migrações do banco |
| `npm run admin:init` | Criação segura do primeiro administrador |
| `npm run seed:presentation -- --confirm-demo-data` | Carregamento intencional de dados fictícios no Neon |
| `npm run lint` | Verificação de código |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes automatizados |
| `npm run demo:check` | Verificação das contas de demonstração |
| `npm run verify:integration` | Testes com banco temporário, compilação e testes HTTP |

A compilação utiliza fontes Google e pode precisar de acesso à internet. Em produção, utilize HTTPS.

## Testes

```sh
npm run lint
npm run typecheck
npm run verify:integration
```

A verificação completa cria um PostgreSQL temporário e um servidor local exclusivos para testes, sem utilizar o banco compartilhado ou a demonstração. Os processos criados são encerrados ao terminar.

Para verificar apenas regras e integração com banco, execute `npm run verify:integration -- --database-only`.

Também é possível definir `TEST_DATABASE_URL` e `TEST_APP_URL` para executar `npm test` contra ambientes descartáveis. Os testes gravam dados e não devem utilizar uma base de produção.

## Estrutura

- `app/`: páginas, componentes e APIs.
- `lib/`: autenticação, permissões, regras de negócio, consultas e migrações.
- `public/`: imagens, ícones e service worker.
- `scripts/`: inicialização, demonstração e verificação.
- `tests/`: testes de regras, banco e APIs.
- `proxy.ts`: proteção e redirecionamento das páginas por perfil.
