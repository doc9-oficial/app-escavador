import docgo, {
  Processo,
  StatusProcesso,
  Parte,
  Movimentacao,
} from "docgo-sdk";

interface BuscarAdvogadoParams {
  oabEstado: string;
  oabNumero: string;
  oabTipo?: "ADVOGADO" | "SUPLEMENTAR" | "ESTAGIARIO" | "CONSULTOR_ESTRANGEIRO";
  ordem?: "asc" | "desc";
  limit?: 50 | 100;
  tribunais?: string[];
  status?: "ATIVO" | "INATIVO";
  dataMinima?: string;
  dataMaxima?: string;
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
      throw new Error("Advogado não encontrado");
    }
    throw new Error(`Falha HTTP ${resp.status}`);
  }
  return resp.json();
}

function extractPartes(detail: any): Parte[] {
  const partes: Parte[] = [];

  // Extrair partes das fontes (tribunais)
  if (detail.fontes && Array.isArray(detail.fontes)) {
    detail.fontes.forEach((fonte: any) => {
      if (fonte.envolvidos && Array.isArray(fonte.envolvidos)) {
        fonte.envolvidos.forEach((envolvido: any) => {
          // Filtrar apenas partes (não juízes, relatores, etc.)
          if (
            envolvido.polo &&
            envolvido.polo !== "NENHUM" &&
            envolvido.tipo !== "JUIZ" &&
            envolvido.tipo !== "RELATOR"
          ) {
            const parte: Parte = {
              tipo: envolvido.polo === "ATIVO" ? "autor" : "reu",
              nome:
                envolvido.nome ||
                envolvido.nome_normalizado ||
                "Nome não informado",
              documento: envolvido.cpf || envolvido.cnpj || "",
              advogados: envolvido.advogados
                ? envolvido.advogados.map((adv: any) => ({
                    nome:
                      adv.nome || adv.nome_normalizado || "Nome não informado",
                    oab: adv.oabs?.[0]?.numero
                      ? `${adv.oabs[0].numero}/${adv.oabs[0].uf}`
                      : "",
                    documento: adv.cpf || "",
                  }))
                : [],
            };

            // Evitar duplicatas
            if (
              !partes.find(
                (p) => p.nome === parte.nome && p.tipo === parte.tipo
              )
            ) {
              partes.push(parte);
            }
          }
        });
      }
    });
  }

  return partes;
}

function buildQueryParams(params: BuscarAdvogadoParams): string {
  const queryParams = new URLSearchParams();

  // Parâmetros obrigatórios
  queryParams.append("oab_estado", params.oabEstado);
  queryParams.append("oab_numero", params.oabNumero);

  // Parâmetros opcionais
  if (params.oabTipo) {
    queryParams.append("oab_tipo", params.oabTipo);
  }

  if (params.ordem) {
    queryParams.append("ordem", params.ordem);
  }

  if (params.limit) {
    queryParams.append("limit", params.limit.toString());
  }

  if (params.tribunais && params.tribunais.length > 0) {
    params.tribunais.forEach((tribunal) => {
      queryParams.append("tribunais[]", tribunal);
    });
  }

  if (params.status) {
    queryParams.append("status", params.status);
  }

  if (params.dataMinima) {
    queryParams.append("data_minima", params.dataMinima);
  }

  if (params.dataMaxima) {
    queryParams.append("data_maxima", params.dataMaxima);
  }

  return queryParams.toString();
}

async function buscarAdvogado(params: BuscarAdvogadoParams): Promise<void> {
  try {
    // Validar parâmetros obrigatórios
    if (!params.oabEstado || !params.oabNumero) {
      console.log(
        docgo.result(
          false,
          null,
          "É necessário informar estado e número da OAB"
        )
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
    const url = `${baseUrl}/advogado/processos?${queryString}`;

    const response = await httpGet(url, token);

    // Mapear resposta da API do Escavador para estrutura do DocGo
    const processos: Processo[] = response.items.map((item: any) => ({
      numero: item.numero_cnj,
      tribunal:
        item.unidade_origem?.tribunal_sigla ||
        item.estado_origem?.sigla ||
        "Desconhecido",
      vara: item.unidade_origem?.nome || "Desconhecida",
      classe: item.fontes?.[0]?.capa?.classe || "Sem classe",
      assunto: item.fontes?.[0]?.capa?.assunto || "Sem assunto",
      dataDistribuicao: new Date(
        item.fontes?.[0]?.capa?.data_distribuicao ||
          item.data_inicio ||
          Date.now()
      ),
      valorCausa: parseFloat(item.fontes?.[0]?.capa?.valor_causa?.valor || "0"),
      status: (item.fontes?.[0]?.capa?.situacao || "ATIVO") as StatusProcesso,
      partes: extractPartes(item),
      movimentacoes: [], // A API do Escavador não retorna movimentações nesta consulta
    }));

    const resultado = {
      advogadoEncontrado: response.advogado_encontrado,
      processos,
      totalProcessos: response.items.length,
      links: response.links,
      paginator: response.paginator,
    };

    console.log(docgo.result(true, resultado));
  } catch (error: any) {
    console.log(docgo.result(false, null, error.message));
  }
}

export default buscarAdvogado;
