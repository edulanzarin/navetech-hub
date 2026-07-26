import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { carregarCargo, listarSetores, listarGrupos } from "../../dados";
import { CargoForm } from "../cargo-form";

export default async function EditarCargo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cargo, setores, grupos] = await Promise.all([
    carregarCargo(Number(id)),
    listarSetores(),
    listarGrupos(),
  ]);
  if (!cargo) notFound();

  return (
    <div>
      <Link
        href="/admin/cargos"
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Cargos
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold tracking-tight">{cargo.nome}</h1>
      <CargoForm cargo={cargo} setores={setores} grupos={grupos} />
    </div>
  );
}
