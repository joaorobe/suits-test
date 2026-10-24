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
