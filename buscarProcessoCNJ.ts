import docgo, {
  Processo,
  StatusProcesso,
  Parte,
  Movimentacao,
} from "docgo-sdk";

interface BuscarProcessoParams {
  numeroProcesso: string;
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
              documento: envolvido.cpf || "",
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

async function buscarProcesso(params: BuscarProcessoParams): Promise<void> {
  try {
    if (Array.isArray(params) && params.length === 1 && typeof params[0] === 'object') {
      params = params[0];
    }
    if (!params.numeroProcesso) {
      console.log(docgo.result(false, null, "numeroProcesso vazio"));
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

    // Busca processo por número CNJ
    const url = `${baseUrl}/processos/numero_cnj/${encodeURIComponent(
      params.numeroProcesso
    )}`;
    const detail = await httpGet(url, token);

    // Mapear resposta da API do Escavador para estrutura do DocGo
    const processo: Processo = {
      numero: detail.numero_cnj || params.numeroProcesso,
      tribunal:
        detail.unidade_origem?.tribunal_sigla ||
        detail.estado_origem?.sigla ||
        "Desconhecido",
      vara: detail.unidade_origem?.nome || "Desconhecida",
      classe: detail.fontes?.[0]?.capa?.classe || "Sem classe",
      assunto: detail.fontes?.[0]?.capa?.assunto || "Sem assunto",
      dataDistribuicao: new Date(
        detail.fontes?.[0]?.capa?.data_distribuicao ||
          detail.data_inicio ||
          Date.now()
      ),
      valorCausa: parseFloat(
        detail.fontes?.[0]?.capa?.valor_causa?.valor || "0"
      ),
      status: (detail.fontes?.[0]?.capa?.situacao || "ATIVO") as StatusProcesso,
      partes: extractPartes(detail),
      movimentacoes: [], // A API do Escavador não retorna movimentações nesta consulta
    };

    console.log(docgo.result(true, { processo }));
  } catch (error: any) {
    console.log(docgo.result(false, null, error.message));
  }
}

export default buscarProcesso;
