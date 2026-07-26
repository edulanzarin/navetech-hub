import Link from "next/link";
import { Plus } from "lucide-react";
import { listarSetores } from "../dados";
import { SetoresTabela } from "./tabela";

export default async function SetoresPage() {
  const setores = await listarSetores();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Setores</h1>
          <p className="mt-1 text-sm text-muted">Agrupam os cargos (Contábil, Fiscal, RH…)</p>
        </div>
        <Link
          href="/admin/setores/novo"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-ent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Novo setor
        </Link>
      </div>

      <div className="mt-6">
        <SetoresTabela setores={setores} />
      </div>
    </div>
  );
}
