import docgo, {
  Processo,
  StatusProcesso,
  Parte,
  Movimentacao,
} from "docgo-sdk";

interface BuscarMovimentacoesParams {
  numeroProcesso: string;
  limit?: 50 | 100;
}

async function httpGet(url: string, token: string): Promise<any> {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error("Token de acesso inválido ou expirado");
    } else if (resp.status === 402) {
      throw new Error("Você não possui saldo em crédito da API");
    } else if (resp.status === 404) {
      throw new Error("Processo não encontrado");
    }
    throw new Error(`Falha HTTP ${resp.status}`);
  }
  return resp.json();
}

function mapMovimentacoes(items: any[]): Movimentacao[] {
  return items.map((item: any) => ({
    data: new Date(item.data),
    descricao: item.conteudo || "Movimentação sem descrição",
    tipo: item.tipo || "ANDAMENTO",
    documentos: [], // A API do Escavador não retorna documentos nas movimentações
    fonte: {
      id: item.fonte?.fonte_id,
      nome: item.fonte?.nome,
      tipo: item.fonte?.tipo,
      sigla: item.fonte?.sigla,
      grau: item.fonte?.grau,
      grauFormatado: item.fonte?.grau_formatado,
    },
  }));
}

function buildQueryParams(params: BuscarMovimentacoesParams): string {
  const queryParams = new URLSearchParams();

  if (params.limit) {
    queryParams.append("limit", params.limit.toString());
  }

  return queryParams.toString();
}

async function buscarMovimentacoes(
  params: BuscarMovimentacoesParams
): Promise<void> {
  try {
    if (Array.isArray(params) && params.length === 1 && typeof params[0] === 'object') {
      params = params[0];
    }
    // Validar parâmetros obrigatórios
    if (!params.numeroProcesso) {
      console.log(
        docgo.result(false, null, "É necessário informar o número do processo")
      );
      return;
    }

    const token = docgo.getEnv("ESCAVADOR_TOKEN") || docgo.getEnv("escavadorToken");
    if (!token) {
      console.log(
        docgo.result(false, null, "Token do Escavador não configurado")
      );
      return;
    }

    const baseUrl = (
      docgo.getEnv("ESCAVADOR_BASE_URL") || "https://api.escavador.com/api/v2"
    ).replace(/\/$/, "");

    // Construir URL com parâmetros de query
    const queryString = buildQueryParams(params);
    const url = `${baseUrl}/processos/numero_cnj/${encodeURIComponent(
      params.numeroProcesso
    )}/movimentacoes?${queryString}`;

    const response = await httpGet(url, token);

    // Mapear resposta da API do Escavador para estrutura do DocGo
    const movimentacoes: Movimentacao[] = mapMovimentacoes(response.items);

    const resultado = {
      numeroProcesso: params.numeroProcesso,
      movimentacoes,
      totalMovimentacoes: response.items.length,
      links: response.links,
      paginator: response.paginator,
    };

    console.log(docgo.result(true, resultado));
  } catch (error: any) {
    console.log(docgo.result(false, null, error.message));
  }
}

export default buscarMovimentacoes;
