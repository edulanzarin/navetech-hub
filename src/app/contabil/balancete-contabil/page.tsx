import { assertSecao } from "@/lib/sessao";
import Conteudo from "./conteudo";

// Guard da seção no server. O Balancete e a Análise são abas da mesma seção
// ("analise"), então dividem a mesma permissão.
export default async function Page() {
  await assertSecao("contabil", "analise");
  return <Conteudo />;
}
