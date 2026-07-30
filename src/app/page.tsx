import { Launcher } from "@/components/launcher";
import { getSessao, modulosAcessiveis } from "@/lib/sessao";

export default async function Home() {
  const sessao = await getSessao();
  // Só o necessário passa para o cliente — nunca o objeto de sessão inteiro.
  return (
    <Launcher
      usuario={sessao.usuario.nome}
      usuarioId={sessao.usuario.id}
      usuarioTemFoto={sessao.usuario.temAvatar}
      acessiveis={modulosAcessiveis(sessao)}
      admin={sessao.usuario.admin}
    />
  );
}
