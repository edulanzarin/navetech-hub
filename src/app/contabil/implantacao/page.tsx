import { assertSecao } from "@/lib/sessao";
import Conteudo from "./conteudo";

// Guard da seção no server: só quem tem a seção "implantacao" do Contábil entra.
export default async function Page() {
  await assertSecao("contabil", "implantacao");
  return <Conteudo />;
}
