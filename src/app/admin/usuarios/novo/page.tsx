import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarCargosParaForm } from "../../dados";
import { UsuarioForm } from "../usuario-form";

export default async function NovoUsuario() {
  const cargos = await listarCargosParaForm();
  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Usuários
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold tracking-tight">Novo usuário</h1>
      <UsuarioForm usuario={null} cargos={cargos} />
    </div>
  );
}
