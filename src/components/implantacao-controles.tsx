"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ContaDropdown } from "@/components/conta-dropdown";
import { DropzoneArquivo } from "@/components/dropzone-arquivo";
import { BotaoExecutar } from "@/components/filters/botao-executar";
import { useEstadoSecao } from "@/hooks/use-estado-secao";
import { useFiltros } from "@/hooks/use-filters";
import type { LinhaCasada } from "@/lib/implantacao-tipos";

/**
 * Controles da Implantação, renderizados pelo shell NA LINHA da barra de
 * filtros, ao lado da empresa (mesmo padrão da Conciliação). Compartilham o
 * estado da seção com a página: subir o PDF e ler aqui reflete a tabela lá.
 *
 * Escolher o PDF NÃO processa — só guarda; quem lê é o botão Ler
 * ([[executar-com-botao]]).
 */
export function ImplantacaoControles() {
  const { filtros } = useFiltros();
  const empresa = filtros.empresas[0];
  const temEmpresa = filtros.empresas.length === 1;

  const [arquivo, setArquivo] = useEstadoSecao<File | null>("arquivo", null);
  const [, setCasadas] = useEstadoSecao<LinhaCasada[] | null>("casadas", null);
  const [nomeLido, setNomeLido] = useEstadoSecao<string | null>("nomeLido", null);
  const [lendo, setLendo] = useState(false);

  // Parâmetros do lote que ficam na barra, ao lado da empresa (a página só
  // mantém histórico + complemento). Estado compartilhado com a página.
  const [estab, setEstab] = useEstadoSecao<string>("estab", "1");
  const [data, setData] = useEstadoSecao<string>("data", "");
  const [contaImpl, setContaImpl] = useEstadoSecao<number | null>("contaImpl", null);

  async function ler() {
    if (!arquivo) return;
    setLendo(true);
    try {
      const fd = new FormData();
      fd.set("arquivo", arquivo);
      fd.set("empresa", String(empresa));
      const res = await fetch("/api/contabil/implantacao/casar", { method: "POST", body: fd });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo?.error ?? "Falha ao ler o balancete");
      setCasadas(corpo.casadas as LinhaCasada[]);
      setNomeLido(arquivo.name);
      toast.success(`${corpo.casadas.length} contas lidas do balancete`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler o balancete");
    } finally {
      setLendo(false);
    }
  }

  if (!temEmpresa) return null;

  // Já leu este arquivo? Então o botão fica neutro (reler é opção).
  const pendente = arquivo != null && nomeLido !== arquivo.name;

  return (
    <>
      <DropzoneArquivo
        aceita={[".pdf"]}
        onArquivo={(f) => setArquivo(f)}
        carregando={lendo}
        nomeArquivo={arquivo?.name}
        rotulo="Escolha o balancete"
        rotuloCarregando="Lendo o balancete…"
      />

      {/* Parâmetros do lote: data de entrada da empresa e conta de contrapartida. */}
      <input
        value={estab}
        onChange={(e) => setEstab(e.target.value.replace(/\D/g, "").slice(0, 2))}
        title="Filial (estabelecimento)"
        placeholder="Filial"
        className="h-9 w-16 rounded-lg border border-hairline bg-surface px-2 text-center text-sm text-ink placeholder:text-muted"
      />
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        title="Data dos lançamentos"
        className="h-9 rounded-lg border border-hairline bg-surface px-2.5 text-sm text-ink"
      />
      <ContaDropdown
        empresa={empresa}
        valor={contaImpl}
        onMudar={setContaImpl}
        limpavel
        placeholder="Conta transitória"
        largura="w-64"
      />

      <div className="ml-auto">
        <BotaoExecutar
          onClick={ler}
          rotulo="Ler balancete"
          dirty={pendente}
          disabled={!arquivo}
          executando={lendo}
          title={!arquivo ? "Escolha o PDF do balancete" : undefined}
        />
      </div>
    </>
  );
}
