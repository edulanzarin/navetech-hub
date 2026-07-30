"use client";

import { useState } from "react";
import { toast } from "sonner";
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
