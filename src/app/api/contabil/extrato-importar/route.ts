import { spawn } from "node:child_process";
import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { FilterError } from "@/lib/fiscal-filters";
import { lerOfx } from "@/lib/extrato-ofx";
import { lerPdf, PdfNaoReconhecido, type PdfLido } from "@/lib/extrato-pdf";
import { regrasDaConta } from "@/lib/extrato-store";
import { gerarLancamentos, type RegraExtrato } from "@/lib/regras-extrato";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Extrai o texto do PDF com `pdftotext -layout`, que preserva as colunas —
 * sem o `-layout` o texto vira uma sopa e não dá para separar valor de
 * descrição. Entra e sai por stdin/stdout, sem arquivo temporário.
 */
function textoDoPdf(bytes: Buffer, senha?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // spawn e não execFile: só o spawn deixa escrever no stdin do processo, e
    // sem isso o pdftotext fica esperando entrada para sempre.
    const args = senha ? ["-layout", "-upw", senha, "-", "-"] : ["-layout", "-", "-"];
    const p = spawn("pdftotext", args);
    const saida: Buffer[] = [];
    let erro = "";

    // Rede de segurança: PDF corrompido não pode segurar a requisição.
    const limite = setTimeout(() => {
      p.kill("SIGKILL");
      reject(new FilterError("A leitura do PDF demorou demais — o arquivo pode estar corrompido"));
    }, 30_000);

    p.stdout.on("data", (d: Buffer) => saida.push(d));
    p.stderr.on("data", (d: Buffer) => (erro += d.toString()));
    p.on("error", () => {
      clearTimeout(limite);
      reject(new FilterError("pdftotext não está disponível no servidor"));
    });
    p.on("close", (code) => {
      clearTimeout(limite);
      if (code !== 0) {
        // Protegido: a mensagem precisa dizer o que fazer, não só que falhou.
        if (/password/i.test(erro)) {
          return reject(
            new FilterError(
              senha
                ? "Senha incorreta para este PDF"
                : "Este PDF está protegido por senha — informe a senha para abrir"
            )
          );
        }
        return reject(
          new FilterError(
            `Não consegui ler o PDF${erro ? `: ${erro.trim().split("\n")[0]}` : ""}. Se ele for digitalizado (imagem), não há texto para extrair — use o OFX.`
          )
        );
      }
      resolve(Buffer.concat(saida).toString("utf8"));
    });

    p.stdin.on("error", () => {});
    p.stdin.end(bytes);
  });
}

/**
 * Lê um extrato (OFX ou PDF), aplica as regras cadastradas da conta de banco e
 * devolve os lançamentos que seriam gerados. Não grava nada: é prévia, para
 * conferir antes de exportar.
 */
export const POST = apiRoute(async (req) => {
  const form = await req.formData();
  const arquivo = form.get("arquivo");
  const empresa = Number(form.get("empresa"));
  const conta = Number(form.get("conta"));
  const senha = (form.get("senha") as string | null)?.trim() || undefined;

  if (!(arquivo instanceof File)) throw new FilterError("Envie o arquivo do extrato");
  if (!Number.isInteger(empresa)) throw new FilterError("Selecione uma empresa");
  await assertEmpresaVisivel(empresa);
  if (!Number.isInteger(conta)) throw new FilterError("Selecione a conta de banco");
  if (arquivo.size > MAX_BYTES) throw new FilterError("Arquivo muito grande (máx. 15 MB)");

  // Não exige cadastro prévio: qualquer conta de banco do plano serve, e sem
  // regra o extrato ainda é lido — as transações saem como pendentes.
  const banco = await regrasDaConta(empresa, conta);

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const nome = arquivo.name.toLowerCase();

  let extrato: PdfLido;
  try {
    if (nome.endsWith(".pdf")) {
      extrato = lerPdf(await textoDoPdf(bytes, senha));
    } else {
      // OFX e variantes (.ofx, .qfx, .sta) são texto.
      extrato = lerOfx(bytes.toString("utf8"));
    }
  } catch (err) {
    if (err instanceof PdfNaoReconhecido) throw new FilterError(err.message);
    throw err;
  }

  if (!extrato.transacoes.length) {
    throw new FilterError("Nenhuma transação encontrada no arquivo");
  }

  const regras: RegraExtrato[] = banco.regras.map((r) => ({
    id: r.id,
    termo: r.termo,
    termoOriginal: r.termoOriginal,
    tipo: r.tipo,
    contaPagamento: r.contaPagamento,
    contaRecebimento: r.contaRecebimento,
    historico: r.historico,
    ativo: r.ativo,
  }));

  const lancamentos = gerarLancamentos(extrato.transacoes, banco.conta, regras);

  const resumo = {
    total: lancamentos.length,
    prontos: lancamentos.filter((l) => !l.pendencia).length,
    semRegra: lancamentos.filter((l) => l.pendencia === "sem_regra").length,
    semConta: lancamentos.filter((l) => l.pendencia === "sem_conta").length,
    ambiguos: lancamentos.filter((l) => l.ambiguo).length,
    entradas: extrato.transacoes.filter((t) => t.valor > 0).reduce((a, b) => a + b.valor, 0),
    saidas: extrato.transacoes.filter((t) => t.valor < 0).reduce((a, b) => a + b.valor, 0),
  };

  return {
    arquivo: arquivo.name,
    banco: extrato.banco,
    agencia: extrato.agencia,
    conta: extrato.conta,
    inicio: extrato.inicio,
    fim: extrato.fim,
    // null = o extrato não traz saldo corrente, então não há o que conferir.
    saldoConfere: extrato.saldoConfere ?? null,
    contaBanco: { conta: banco.conta, descricao: banco.descricao, apelido: banco.apelido },
    resumo,
    lancamentos,
  };
});
