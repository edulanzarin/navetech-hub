import { ShellPublico } from "@/components/shell-publico";
import { DenunciaForm } from "./denuncia-form";

/**
 * Canal de denúncia PÚBLICO (sem login) — fora dos layouts com `assertAcesso`,
 * então é aberto por qualquer link. O relato é anônimo; ao final a pessoa
 * recebe protocolo+senha para acompanhar.
 */
export default function Page() {
  return (
    <ShellPublico>
      <DenunciaForm />
    </ShellPublico>
  );
}
