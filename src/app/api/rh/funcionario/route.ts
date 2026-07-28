import { apiRoute } from "@/lib/api-route";
import { FilterError } from "@/lib/fiscal-filters";
import { ehEmpresaRh } from "@/lib/rh";
import { fichaFuncionario } from "@/lib/funcionario-ficha";

/** Ficha completa de um contrato do RH — mesma ficha da Folha, escopo das empresas do RH. */
export const GET = apiRoute(async (req) => {
  const empresa = Number(req.nextUrl.searchParams.get("empresa"));
  const contrato = Number(req.nextUrl.searchParams.get("contrato"));
  if (!Number.isInteger(empresa) || !Number.isInteger(contrato)) {
    throw new FilterError("Informe empresa e contrato");
  }
  // Escopo do RH é fixo: qualquer empresa fora de {NAVECON, FOUR, FINAVE} não existe aqui.
  if (!ehEmpresaRh(empresa)) throw new FilterError("Colaborador não encontrado");

  const ficha = await fichaFuncionario(empresa, contrato);
  if (!ficha) throw new FilterError("Colaborador não encontrado");
  return ficha;
});
