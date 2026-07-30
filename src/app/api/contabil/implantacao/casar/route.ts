import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { FilterError } from "@/lib/fiscal-filters";
import { casarColado } from "@/lib/implantacao-servico";

/** Cola do balancete → linhas casadas contra o plano da empresa (com resumo). */
export const POST = apiRoute(async (req) => {
  const body = (await req.json()) as { empresa: number; texto: string };
  if (!Number.isInteger(body.empresa)) throw new FilterError("Selecione uma empresa");
  await assertEmpresaVisivel(body.empresa);
  if (!body.texto?.trim()) throw new FilterError("Cole o balancete de origem");

  const casadas = await casarColado(body.empresa, body.texto);
  const resumo = {
    total: casadas.length,
    casadas: casadas.filter((c) => c.status === "casada").length,
    duvidosas: casadas.filter((c) => c.status === "duvidosa").length,
    semConta: casadas.filter((c) => c.status === "sem_conta").length,
  };
  return { casadas, resumo };
});
