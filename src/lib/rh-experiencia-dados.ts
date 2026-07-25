import "server-only";
import { randomBytes } from "node:crypto";
import { query } from "./db";
import { EMPRESAS_RH, nomeEmpresaRh, appUrl } from "./rh";
import type { Marco } from "./rh-experiencia";
import { rotuloMarco } from "./rh-experiencia";

/**
 * Lado servidor da experiência: a consulta ao Questor dos contratos em curso e
 * o e-mail do formulário. Separado da parte pura (rh-experiencia) para não
 * arrastar `pg`/`server-only` para o formulário público (client).
 */

export interface ContratoExperiencia {
  codigoempresa: number;
  codigofunccontr: number;
  nome: string;
  dataadm: string; // YYYY-MM-DD
  codigoestab: number;
  classiforgan: string | null;
  setor: string | null;
  cargo: string | null;
}

/** Token opaco do link público (URL-safe). */
export function gerarToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Contratos das empresas RH ainda dentro da janela de experiência — admitidos
 * há no máximo `janelaDias` (default 120: cobre o marco de 90 + folga p/ atraso)
 * e ainda ativos. Só CLT/empregado (`categoria = '01'`); diretor/estagiário não
 * entram em experiência. Base é a view `funcionario` (ficha atual por contrato).
 */
export async function buscarContratosExperiencia(
  empresas: number[] = [...EMPRESAS_RH],
  janelaDias = 120
): Promise<ContratoExperiencia[]> {
  return query<ContratoExperiencia>(
    `select f.codigoempresa, f.codigofunccontr, f.nomefunc as nome,
            to_char(f.dataadm, 'YYYY-MM-DD') as dataadm,
            f.codigoestab, f.classiforgan,
            nullif(btrim(o.descrorgan), '') as setor,
            nullif(btrim(ca.descrcargo), '') as cargo
       from funcionario f
       left join organograma o
         on o.codigoempresa = f.codigoempresa and o.codigoestab = f.codigoestab
        and o.classiforgan = f.classiforgan
       left join cargo ca on ca.codigocargo = f.codigocargo
      where f.codigoempresa = any($1::int[])
        and f.datadem is null
        and f.categoria = '01'
        and f.dataadm >= current_date - ($2::int)
      order by f.dataadm desc, f.codigoempresa`,
    [empresas, janelaDias]
  );
}

/** Corpo do e-mail do formulário de experiência (HTML simples, inline). */
export function emailExperiencia(params: {
  funcionario: string;
  empresa: number;
  cargo: string | null;
  setor: string | null;
  marco: Marco;
  vencimento: string; // YYYY-MM-DD
  token: string;
  atrasado?: boolean;
}): { assunto: string; html: string } {
  const link = `${appUrl()}/experiencia/${params.token}`;
  const venc = formatarData(params.vencimento);
  const marcoTxt = rotuloMarco(params.marco);
  const urgencia = params.atrasado
    ? `<p style="color:#b91c1c;font-weight:600">Este prazo já venceu (${venc}). Responda o quanto antes.</p>`
    : `<p>Prazo para avaliação: <strong>${venc}</strong>.</p>`;

  const assunto = `${params.atrasado ? "[ATRASADO] " : ""}Avaliação de experiência (${marcoTxt}) — ${params.funcionario}`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">
    <p>Olá,</p>
    <p>O contrato de experiência de <strong>${escapar(params.funcionario)}</strong>
       está no marco de <strong>${marcoTxt}</strong> e precisa da sua avaliação.</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:2px 8px;color:#555">Empresa</td><td style="padding:2px 8px"><strong>${nomeEmpresaRh(params.empresa)}</strong></td></tr>
      <tr><td style="padding:2px 8px;color:#555">Cargo</td><td style="padding:2px 8px">${escapar(params.cargo ?? "—")}</td></tr>
      <tr><td style="padding:2px 8px;color:#555">Setor</td><td style="padding:2px 8px">${escapar(params.setor ?? "—")}</td></tr>
    </table>
    ${urgencia}
    <p style="margin:20px 0">
      <a href="${link}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">
        Preencher avaliação
      </a>
    </p>
    <p style="color:#555;font-size:12px">Ou copie este link: <br>${link}</p>
    <p style="color:#555;font-size:12px">Não é preciso login. O link é pessoal — não repasse.</p>
  </div>`;

  return { assunto, html };
}

function formatarData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function escapar(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}
