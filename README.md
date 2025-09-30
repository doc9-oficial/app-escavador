# App escavador

Aplicação DocGo integrada ao Escavador.

## Funcionalidades

- **buscarProcessoCNJ**: Consulta processo pelo número CNJ.
- **buscarEnvolvido**: Busca processos de um envolvido por nome ou CPF/CNPJ.
- **buscarAdvogado**: Busca processos de um advogado por OAB.
- **buscarMovimentacoes**: Lista movimentações de um processo.

## Estrutura

```
escavador/
  manifest.json
  src/
    buscarProcessoCNJ.ts
    buscarEnvolvido.ts
    buscarAdvogado.ts
    buscarMovimentacoes.ts
  dist/ (build gerado por tsc)
  package.json
  tsconfig.json
  .env (opcional)
```

## Variáveis de Ambiente (.env)

| Chave                | Descrição                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `ESCAVADOR_TOKEN`    | Token de autenticação para API Escavador                            |
| `ESCAVADOR_BASE_URL` | Base da API (default `https://api.escavador.com/api/v1`)            |
| `DOCGO_DEBUG`        | `1` para logs de debug                                              |

Exemplo `.env`:

```
ESCAVADOR_TOKEN=seu_token_aqui
DOCGO_DEBUG=1
```

## Execução (via DocGo)

```
./docgo escavador buscarProcessoCNJ 00000000000000000000
./docgo escavador buscarEnvolvido "Nome ou CPF"
./docgo escavador buscarAdvogado OAB
./docgo escavador buscarMovimentacoes 00000000000000000000
```

## Execução Direta (dev)

```
node dist/buscarProcessoCNJ.js 00000000000000000000
node dist/buscarEnvolvido.js "Nome ou CPF"
node dist/buscarAdvogado.js OAB
node dist/buscarMovimentacoes.js 00000000000000000000
```

(O SDK infere função e manifest.)

## Build

```
npm install
npm run build
```

## Fluxos

### buscarProcessoCNJ

1. Normaliza número do processo.
2. GET `/processos/{numero}` na API Escavador.
3. Monta objeto `Processo` padronizado.
4. Retorna JSON via `docgo.result`.

### buscarEnvolvido

1. Normaliza entrada (nome ou CPF/CNPJ).
2. GET `/envolvidos?query=...` na API Escavador.
3. Retorna lista de processos relacionados.

### buscarAdvogado

1. Normaliza número da OAB.
2. GET `/advogados/{oab}` na API Escavador.
3. Retorna lista de processos do advogado.

### buscarMovimentacoes

1. Normaliza número do processo.
2. GET `/processos/{numero}/movimentacoes` na API Escavador.
3. Retorna lista de movimentações.

## Erros comuns

- Token expirado ou inválido.
- Falta de permissão na API.
- Headers obrigatórios ausentes.

## Próximos Passos

- Melhorias nas funções de busca.
- Cache local simples para respostas recentes.
- Testes automatizados (mock fetch).

## Licença