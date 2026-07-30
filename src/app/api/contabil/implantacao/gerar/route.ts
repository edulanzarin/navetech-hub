import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { FilterError } from "@/lib/fiscal-filters";
import { registrarAuditoria } from "@/lib/auditoria";
import { casarColado } from "@/lib/implantacao-servico";
import { gerarArquivoImplantacao } from "@/lib/implantacao-gerar";

/**
 * Gera o arquivo de importação do Questor. Re-parseia e re-casa a partir da cola
 * + overrides salvos (fonte da verdade), aplica os parâmetros do lote e devolve
 * o texto. Gerar arquivo de dado contábil é evento auditável.
 */
export const POST = apiRoute(async (req) => {
  const body = (await req.json()) as {
    empresa: number;
    estab: number;
    data: string;
    contaImplantacao: number;
    codigoHistorico: number;
    complemento: string;
    texto: string;
  };
  if (!Number.isInteger(body.empresa)) throw new FilterError("Selecione uma empresa");
  await assertEmpresaVisivel(body.empresa);
  if (!Number.isInteger(body.estab)) throw new FilterError("Informe a filial (estabelecimento)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.data ?? "")) throw new FilterError("Informe a data dos lançamentos");
  if (!Number.isInteger(body.contaImplantacao)) throw new FilterError("Escolha a conta transitória de implantação");
  if (!Number.isInteger(body.codigoHistorico)) throw new FilterError("Informe o código do histórico");
  if (!body.texto?.trim()) throw new FilterError("Cole o balancete de origem");

  const casadas = await casarColado(body.empresa, body.texto);
  const res = gerarArquivoImplantacao(casadas, {
    empresa: body.empresa,
    estab: body.estab,
    data: body.data,
    contaImplantacao: body.contaImplantacao,
    codigoHistorico: body.codigoHistorico,
    complemento: body.complemento ?? "",
  });

  await registrarAuditoria({
    acao: "contabil.implantacao.gerar",
    alvo: `Empresa ${body.empresa} · ${body.data} · ${res.linhas} lançamentos`,
    codigoempresa: body.empresa,
    detalhe: {
      linhas: res.linhas,
      totalDebito: res.totalDebito,
      totalCredito: res.totalCredito,
      transitoriaZera: res.transitoriaZera,
      semConta: res.semConta.length,
    },
  });

  return res;
});
