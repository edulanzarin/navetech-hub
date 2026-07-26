import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { carregarSetor } from "../../dados";
import { SetorForm } from "../setor-form";

export default async function EditarSetor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const setor = await carregarSetor(Number(id));
  if (!setor) notFound();

  return (
    <div>
      <Link
        href="/admin/setores"
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Setores
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold tracking-tight">{setor.nome}</h1>
      <SetorForm setor={setor} />
    </div>
  );
}
