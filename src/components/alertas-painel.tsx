import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Alerta, Severidade } from "@/lib/alertas";

/**
 * Painel de alertas na home. Só aparece quando há pendência que a sessão pode
 * ver. Cada linha leva à tela onde se resolve o alerta. Presentacional — a
 * coleta (com escopo/permissão) já rodou no servidor.
 */
const COR: Record<Severidade, string> = {
  alta: "bg-red-500",
  media: "bg-amber-500",
  baixa: "bg-sky-500",
};

export function AlertasPainel({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null;
  const total = alertas.reduce((s, a) => s + a.contagem, 0);

  return (
    <section className="mt-8 rounded-xl border border-hairline bg-surface p-1.5">
      <div className="flex items-center gap-2 px-3 py-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Alertas</h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
          {total}
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {alertas.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
            >
              <span className={`size-2 shrink-0 rounded-full ${COR[a.severidade]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.titulo}</p>
                <p className="truncate text-xs text-muted">{a.detalhe}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
