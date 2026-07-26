"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import clsx from "clsx";
import { getModulo, secoesDoModulo, type ModuloId } from "@/lib/modulos";
import { sair } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";

/**
 * Sidebar escopada a um módulo: mostra só as seções dele. A escolha do módulo
 * acontece antes, no launcher — aqui o único caminho para outro módulo é
 * "Trocar módulo", que volta ao launcher. Escala para muitos módulos sem virar
 * paredão de links, porque cada módulo tem sua própria sidebar enxuta.
 */
export function ModuloSidebar({
  moduloId,
  visiveis,
  usuario,
}: {
  moduloId: ModuloId;
  /** Ids das seções que a sessão pode ver. Ausente = todas (retrocompat). */
  visiveis?: string[];
  usuario?: { id: string; nome: string; temFoto: boolean };
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const suffix = qs ? `?${qs}` : "";

  const modulo = getModulo(moduloId);
  const permitidas = visiveis ? new Set(visiveis) : null;
  const secoes = secoesDoModulo(moduloId).filter((s) => !permitidas || permitidas.has(s.id));
  if (!modulo) return null;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-hairline bg-surface px-3 py-5">
      <Link
        href="/"
        className="flex items-center gap-1.5 px-2 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5" />
        Trocar módulo
      </Link>

      <div className="mt-3 flex items-center gap-2.5 px-2">
        <Image src={modulo.icone} alt="" width={36} height={36} unoptimized className="size-9" />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">{modulo.titulo}</p>
          <p className="text-[11px] text-muted">Navetech Hub</p>
        </div>
      </div>

      <nav className="mt-7 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {secoes.map((s) => {
          const Ico = s.icone;
          const ativa = pathname === s.path || pathname.startsWith(s.path + "/");
          return (
            <Link
              key={s.id}
              href={`${s.path}${suffix}`}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                ativa
                  ? "bg-ent/12 font-medium text-ent"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )}
            >
              <Ico className="size-4 shrink-0" />
              {s.rotulo}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 flex flex-col gap-0.5 border-t border-hairline pt-2">
        <ThemeToggle />
        {usuario && (
          <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
            <Avatar id={usuario.id} nome={usuario.nome} temFoto={usuario.temFoto} size={28} />
            <p className="truncate text-xs text-ink-2" title={usuario.nome}>
              {usuario.nome}
            </p>
          </div>
        )}
        <form action={sair}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="size-4 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
