import { Loader2 } from "lucide-react";

/**
 * Cabeçalho padrão de toda seção, em todos os módulos: só o título da seção à
 * esquerda e, à direita, o indicador de carregamento e o que a tela quiser
 * (ex.: o período). Sem eyebrow do módulo, sem subtítulo, sem ícone — o módulo
 * já é identificado na sidebar.
 */
export function ModuloHeader({
  titulo,
  carregando,
  direita,
}: {
  titulo: string;
  carregando?: boolean;
  direita?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      <div className="flex items-center gap-4">
        {carregando && (
          <span className="anim-fade-in flex items-center gap-2 text-xs text-muted">
            <Loader2 className="size-4 animate-spin" />
            Atualizando…
          </span>
        )}
        {direita}
      </div>
    </header>
  );
}
