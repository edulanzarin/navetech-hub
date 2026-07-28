"use client";

import { mutar } from "@/hooks/mutar";
import { useRhGestores, useRhSetores } from "@/hooks/use-api";
import type { GestorRh, SetorRh } from "@/lib/rh-tipos";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PAPEIS: GestorRh["papel"][] = ["supervisor", "coordenador", "outro"];
const PAPEL_ROTULO: Record<GestorRh["papel"], string> = {
  supervisor: "Supervisor",
  coordenador: "Coordenador",
  outro: "Outro",
};

function PapelSegmentos({
  valor,
  onMudar,
}: {
  valor: GestorRh["papel"];
  onMudar: (p: GestorRh["papel"]) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
      {PAPEIS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onMudar(p)}
          className={clsx(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            valor === p ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
          )}
        >
          {PAPEL_ROTULO[p]}
        </button>
      ))}
    </div>
  );
}

function SetorCard({
  setor,
  gestores,
}: {
  setor: SetorRh;
  gestores: GestorRh[];
}) {
  const queryClient = useQueryClient();
  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["rh-gestores"] });

  const [addNome, setAddNome] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPapel, setAddPapel] = useState<GestorRh["papel"]>("supervisor");
  const [salvando, setSalvando] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPapel, setEditPapel] = useState<GestorRh["papel"]>("supervisor");

  const adicionar = async () => {
    if (!addNome.trim() || !addEmail.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    setSalvando(true);
    try {
      await mutar("/api/rh/gestores", "POST", {
        classiforgan: setor.classiforgan,
        nome: addNome,
        email: addEmail,
        papel: addPapel,
      });
      setAddNome("");
      setAddEmail("");
      setAddPapel("supervisor");
      invalidar();
      toast.success("Gestor adicionado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao adicionar");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (g: GestorRh) => {
    try {
      await mutar(`/api/rh/gestores?id=${g.id}`, "DELETE");
      invalidar();
      toast.success(`${g.nome} removido`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    }
  };

  const abrirEdicao = (g: GestorRh) => {
    setEditId(g.id);
    setEditNome(g.nome);
    setEditEmail(g.email);
    setEditPapel(g.papel);
  };

  const salvarEdicao = async () => {
    try {
      await mutar("/api/rh/gestores", "PATCH", {
        id: editId,
        nome: editNome,
        email: editEmail,
        papel: editPapel,
      });
      setEditId(null);
      invalidar();
      toast.success("Gestor atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  return (
    <div className="card break-inside-avoid overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <h3 className="font-semibold text-ink">{setor.nome}</h3>
        <span className="text-xs text-muted">{setor.ativos} ativos</span>
      </header>

      <div className="divide-y divide-hairline/60">
        {gestores.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted">
            Nenhum gestor cadastrado neste departamento.
          </p>
        )}
        {gestores.map((g) =>
          editId === g.id ? (
            <div key={g.id} className="space-y-2 px-4 py-3">
              <div className="flex gap-2">
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="h-8 w-1/2 flex-1 rounded-lg border border-hairline bg-surface px-2.5 text-sm outline-none focus:border-ink/30"
                  placeholder="Nome"
                />
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-8 w-1/2 flex-1 rounded-lg border border-hairline bg-surface px-2.5 text-sm outline-none focus:border-ink/30"
                  placeholder="E-mail"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <PapelSegmentos valor={editPapel} onMudar={setEditPapel} />
                <div className="flex items-center gap-1">
                  <button
                    onClick={salvarEdicao}
                    className="grid size-8 place-items-center rounded-lg text-good transition-colors hover:bg-good/12"
                    aria-label="Salvar"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Cancelar"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={g.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">
                    {g.nome}
                  </span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {PAPEL_ROTULO[g.papel]}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">{g.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => abrirEdicao(g)}
                  className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Editar"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => remover(g)}
                  className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-critical/12 hover:text-critical"
                  aria-label="Remover"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Adicionar */}
      <div className="space-y-2 border-t border-hairline bg-surface-2/40 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={addNome}
            onChange={(e) => setAddNome(e.target.value)}
            className="h-8 w-1/2 flex-1 rounded-lg border border-hairline bg-surface px-2.5 text-sm outline-none placeholder:text-muted focus:border-ink/30"
            placeholder="Nome do gestor"
          />
          <input
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            className="h-8 w-1/2 flex-1 rounded-lg border border-hairline bg-surface px-2.5 text-sm outline-none placeholder:text-muted focus:border-ink/30"
            placeholder="e-mail@navecon.com.br"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <PapelSegmentos valor={addPapel} onMudar={setAddPapel} />
          <button
            onClick={adicionar}
            disabled={salvando}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Conteudo() {
  const { data: setores, isLoading } = useRhSetores();
  const { data: gestores } = useRhGestores();

  // Gestores por departamento (classiforgan). As empresas do RH compartilham os
  // departamentos, então é um cadastro só por departamento.
  const porSetor = useMemo(() => {
    const mapa = new Map<string, GestorRh[]>();
    for (const g of gestores ?? []) {
      const arr = mapa.get(g.classiforgan);
      if (arr) arr.push(g);
      else mapa.set(g.classiforgan, [g]);
    }
    return mapa;
  }, [gestores]);

  return (
    <>
      <p className="max-w-3xl text-sm text-muted">
        Cadastre os supervisores e coordenadores de cada departamento.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40" />
          ))}
        </div>
      ) : (setores ?? []).length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center text-muted">
          <Users className="size-8 opacity-40" />
          <p>Nenhum departamento com funcionários ativos.</p>
        </div>
      ) : (
        // Masonry (colunas): cada carta ocupa só a sua altura, sem esticar para
        // igualar a vizinha (o vazião do Societário sumiu).
        <div className="columns-1 gap-4 [&>*]:mb-4 lg:columns-2">
          {(setores ?? []).map((s) => (
            <SetorCard
              key={s.classiforgan}
              setor={s}
              gestores={porSetor.get(s.classiforgan) ?? []}
            />
          ))}
        </div>
      )}
    </>
  );
}
