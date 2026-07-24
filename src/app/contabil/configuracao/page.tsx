import { assertSecao, nivelSecao, satisfaz } from "@/lib/sessao";
import Conteudo from "./conteudo";

// Guard real da seção: navegação client-side não re-roda o layout, então a
// tranca por seção mora aqui (server). Nega redirecionando para o launcher.
// A Configuração é visível com `view` (leitura do plano), mas as ações de
// escrita só aparecem com `edit`: o `podeEditar` desce para o conteúdo esconder
// os botões. A tranca real segue no /api, que exige edit.
export default async function Page() {
  const sessao = await assertSecao("contabil", "conferencia");
  const podeEditar = satisfaz(nivelSecao(sessao, "contabil", "conferencia"), "edit");
  return <Conteudo podeEditar={podeEditar} />;
}
