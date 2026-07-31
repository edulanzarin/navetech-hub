import { assertSecao } from "@/lib/sessao";
import Conteudo from "./conteudo";

// Guard da seção no server (a navegação client-side não re-roda o layout).
export default async function Page() {
  await assertSecao("contabil", "provisoes");
  return <Conteudo />;
}
