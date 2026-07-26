import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { carregarUsuario, listarCargosParaForm, listarGrupos, listarTodasEmpresas } from "../../dados";
import { UsuarioForm } from "../usuario-form";

export default async function EditarUsuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [usuario, cargos, grupos, empresas] = await Promise.all([
    carregarUsuario(id),
    listarCargosParaForm(),
    listarGrupos(),
    listarTodasEmpresas(),
  ]);
  if (!usuario) notFound();

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Usuários
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold tracking-tight">{usuario.nome}</h1>
      <UsuarioForm usuario={usuario} cargos={cargos} grupos={grupos} empresas={empresas} />
    </div>
  );
}
