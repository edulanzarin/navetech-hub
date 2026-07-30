import "server-only";
import { spawn } from "node:child_process";
import { FilterError } from "./fiscal-filters";

/**
 * Extrai o texto de um PDF com `pdftotext -layout`, que preserva as colunas —
 * sem o `-layout` o texto vira uma sopa e não dá para separar valor de
 * descrição. Entra e sai por stdin/stdout, sem arquivo temporário. Compartilhado
 * pela Conciliação (extrato) e pela Implantação (balancete).
 */
export function textoDoPdf(bytes: Buffer, senha?: string): Promise<string> {
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
            `Não consegui ler o PDF${erro ? `: ${erro.trim().split("\n")[0]}` : ""}. Se ele for digitalizado (imagem), não há texto para extrair.`
          )
        );
      }
      resolve(Buffer.concat(saida).toString("utf8"));
    });

    p.stdin.on("error", () => {});
    p.stdin.end(bytes);
  });
}
