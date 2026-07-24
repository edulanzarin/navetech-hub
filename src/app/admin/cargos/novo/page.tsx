import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarSetores, listarGrupos } from "../../dados";
import { CargoForm } from "../cargo-form";

export default async function NovoCargo() {
  const [setores, grupos] = await Promise.all([listarSetores(), listarGrupos()]);
  return (
    <div>
      <Link
        href="/admin/cargos"
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Cargos
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold tracking-tight">Novo cargo</h1>
      <CargoForm cargo={null} setores={setores} grupos={grupos} />
    </div>
  );
}
