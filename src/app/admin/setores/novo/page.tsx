import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SetorForm } from "../setor-form";

export default function NovoSetor() {
  return (
    <div>
      <Link
        href="/admin/setores"
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" /> Setores
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold tracking-tight">Novo setor</h1>
      <SetorForm setor={null} />
    </div>
  );
}
