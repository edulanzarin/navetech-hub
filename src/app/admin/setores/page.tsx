import { Plus, Trash2 } from "lucide-react";
import { listarSetores } from "../dados";
import { salvarSetor, excluirSetor } from "../actions";

const input =
  "h-9 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-ent/50";

export default async function SetoresPage() {
  const setores = await listarSetores();

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Setores</h1>
        <p className="mt-1 text-sm text-muted">Agrupam os cargos (Contábil, Fiscal, RH…)</p>
      </div>

      <form action={salvarSetor} className="mt-6 flex max-w-md gap-2">
        <input name="nome" required placeholder="Nome do setor" className={`${input} flex-1`} />
        <button
          type="submit"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-ent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Adicionar
        </button>
      </form>

      <div className="card mt-4 max-w-2xl divide-y divide-hairline">
        {setores.length === 0 && <p className="px-4 py-6 text-sm text-muted">Nenhum setor ainda.</p>}
        {setores.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
            <form action={salvarSetor} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={s.id} />
              <input name="nome" defaultValue={s.nome} className={`${input} flex-1`} />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg border border-hairline px-3 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Salvar
              </button>
            </form>
            <span className="shrink-0 text-xs text-muted">
              {s.cargos} {s.cargos === 1 ? "cargo" : "cargos"}
            </span>
            <form action={excluirSetor}>
              <input type="hidden" name="id" value={s.id} />
              <button
                type="submit"
                title="Excluir setor"
                className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-critical/12 hover:text-critical"
              >
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
