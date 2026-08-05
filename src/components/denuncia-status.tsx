import clsx from "clsx";
import { STATUS_DENUNCIA_ROTULO, type StatusDenuncia } from "@/lib/denuncia-tipos";

/** Pílula de status da denúncia — mesmo padrão de badge do resto do app. */
const TOM: Record<StatusDenuncia, string> = {
  recebida: "bg-warning/12 text-warning",
  em_analise: "bg-ent/12 text-ent",
  concluida: "bg-good/12 text-good",
  arquivada: "bg-surface-2 text-muted",
};

export function StatusDenunciaBadge({ status }: { status: StatusDenuncia }) {
  return (
    <span className={clsx("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", TOM[status])}>
      {STATUS_DENUNCIA_ROTULO[status]}
    </span>
  );
}
