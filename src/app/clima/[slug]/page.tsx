import { ShellPublico, AvisoPublico } from "@/components/shell-publico";
import { rodadaAbertaPorSlug } from "@/lib/clima";
import { ClimaForm } from "./clima-form";

/**
 * Avaliação anônima da empresa (clima) — link PÚBLICO por rodada (/clima/<slug>).
 * Fora dos layouts com `assertAcesso`, então é aberto. Resolve a rodada no
 * servidor; se não estiver aberta, mostra aviso.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rodada = await rodadaAbertaPorSlug(slug);

  return (
    <ShellPublico>
      {rodada ? (
        <ClimaForm rodada={rodada} />
      ) : (
        <AvisoPublico
          titulo="Avaliação indisponível"
          texto="Este link não existe ou a rodada de avaliação já foi encerrada. Verifique com o RH."
        />
      )}
    </ShellPublico>
  );
}
