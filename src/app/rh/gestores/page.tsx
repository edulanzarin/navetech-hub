import { assertSecao } from "@/lib/sessao";
import Conteudo from "./conteudo";

export default async function Page() {
  await assertSecao("rh", "gestores");
  return <Conteudo />;
}
