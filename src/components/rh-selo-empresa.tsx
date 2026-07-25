import clsx from "clsx";
import { nomeEmpresaRh } from "@/lib/rh";

/** Selo da empresa do RH: NAVECON (entradas) e FOUR (saídas) em cores distintas. */
export function SeloEmpresa({ codigo, className }: { codigo: number; className?: string }) {
  const navecon = codigo === 1;
  return (
    <span
      className={clsx(
        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        navecon ? "bg-ent/12 text-ent" : "bg-sai/12 text-sai",
        className
      )}
    >
      {nomeEmpresaRh(codigo)}
    </span>
  );
}
