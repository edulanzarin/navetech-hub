import { apiRoute } from "@/lib/api-route";
import { empresasDoFiltro } from "@/lib/rh";
import { montarPainelExperiencia } from "@/lib/rh-experiencia-dados";

/** Painel de experiência: marcos 45/90 dos contratos em curso, com status. */
export const GET = apiRoute(async (req) => {
  const empresas = empresasDoFiltro(req.nextUrl.searchParams.get("empresa"));
  return montarPainelExperiencia(empresas);
});
