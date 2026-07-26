import "server-only";
import { randomBytes } from "node:crypto";
import { query } from "./db";
import { appQuery } from "./app-db";
import { enviarEmail } from "./mailer";
import { EMPRESAS_RH, nomeEmpresaRh, appUrl } from "./rh";
import { MARCOS, type Marco, type StatusExperiencia } from "./rh-experiencia";
import { rotuloMarco, recomendacoesDoMarco } from "./rh-experiencia";
import type { ExperienciaItem } from "./rh-tipos";

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

// ── Formulário público (por token, sem login) ────────────────────────────────

export interface ExperienciaPublica {
  nome: string;
  empresa: number;
  cargo: string | null;
  setor: string | null;
  marco: Marco;
  vencimento: string;
  jaRespondido: boolean;
}

/** Dados do formulário público a partir do token (ou null se o token não existe). */
export async function carregarExperienciaPorToken(
  token: string
): Promise<ExperienciaPublica | null> {
  const [e] = await appQuery<{
    codigoempresa: number;
    codigofunccontr: number;
    marco: Marco;
    data_vencimento: string;
    status: StatusExperiencia;
  }>(
    `select codigoempresa, codigofunccontr, marco,
            to_char(data_vencimento, 'YYYY-MM-DD') as data_vencimento, status
       from rh_experiencia where token = $1`,
    [token]
  );
  if (!e) return null;
  const c = await buscarUmContrato(e.codigoempresa, e.codigofunccontr);
  return {
    nome: c?.nome ?? "Funcionário",
    empresa: e.codigoempresa,
    cargo: c?.cargo ?? null,
    setor: c?.setor ?? null,
    marco: e.marco,
    vencimento: e.data_vencimento,
    jaRespondido: e.status === "respondido",
  };
}

export interface RespostaEntrada {
  respondidoPorNome: string;
  respondidoPorEmail?: string | null;
  recomendacao: string;
  criterios: Record<string, number>;
  comentarios?: string | null;
}

/** Salva a resposta do gestor e marca a experiência como respondida. */
export async function salvarRespostaExperiencia(
  token: string,
  dados: RespostaEntrada
): Promise<{ ok: boolean; erro?: string }> {
  const [e] = await appQuery<{ id: number; marco: Marco; status: StatusExperiencia }>(
    `select id, marco, status from rh_experiencia where token = $1`,
    [token]
  );
  if (!e) return { ok: false, erro: "Formulário não encontrado" };
  if (e.status === "respondido") return { ok: false, erro: "Este formulário já foi respondido" };
  if (!dados.respondidoPorNome?.trim()) return { ok: false, erro: "Informe seu nome" };

  const validas = recomendacoesDoMarco(e.marco).map((r) => r.valor as string);
  if (!validas.includes(dados.recomendacao)) return { ok: false, erro: "Recomendação inválida" };

  const [inserida] = await appQuery<{ id: number }>(
    `insert into rh_experiencia_resposta
        (experiencia_id, respondido_por_nome, respondido_por_email, recomendacao, respostas, comentarios)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (experiencia_id) do nothing
     returning id`,
    [
      e.id,
      dados.respondidoPorNome.trim(),
      dados.respondidoPorEmail?.trim() || null,
      dados.recomendacao,
      JSON.stringify({ criterios: dados.criterios ?? {} }),
      dados.comentarios?.trim() || null,
    ]
  );
  if (!inserida) return { ok: false, erro: "Este formulário já foi respondido" };

  await appQuery(`update rh_experiencia set status = 'respondido' where id = $1`, [e.id]);
  return { ok: true };
}

/** Um contrato específico (para reenvio pontual do formulário). */
export async function buscarUmContrato(
  codigoempresa: number,
  contrato: number
): Promise<ContratoExperiencia | null> {
  const [row] = await query<ContratoExperiencia>(
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
      where f.codigoempresa = $1 and f.codigofunccontr = $2`,
    [codigoempresa, contrato]
  );
  return row ?? null;
}

/** Data de vencimento de um marco (admissão + marco dias). */
export function vencimentoMarco(dataadm: string, marco: Marco): string {
  return addDias(dataadm, marco);
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

// ── Datas (DATE do Postgres vem como "YYYY-MM-DD"; trabalha em UTC p/ não pular
//    de dia por fuso) ──────────────────────────────────────────────────────────
function addDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

interface LinhaExperiencia {
  id: number;
  codigoempresa: number;
  codigofunccontr: number;
  marco: Marco;
  status: StatusExperiencia;
  recomendacao: string | null;
  respondido_por_nome: string | null;
  respondido_em: string | null;
  comentarios: string | null;
  ultimo_lembrete: string | null;
}

/** Contagem de gestores ativos por DEPARTAMENTO (chave = classiforgan). */
async function contagemGestores(): Promise<Map<string, number>> {
  const rows = await appQuery<{ classiforgan: string; n: number }>(
    `select classiforgan, count(*)::int as n
       from rh_setor_gestor where ativo
      group by classiforgan`
  );
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.classiforgan, r.n);
  return m;
}

/**
 * Painel de experiência: para cada contrato em curso, projeta os marcos 45 e 90
 * e casa com o que já foi materializado (rh_experiencia + resposta + último
 * lembrete). Mostra marco projetado quando ainda não materializado (o job só
 * cria a linha ao entrar na janela de 15 dias), e o materializado sempre.
 */
export async function montarPainelExperiencia(
  empresas: number[] = [...EMPRESAS_RH]
): Promise<ExperienciaItem[]> {
  const [contratos, gestores] = await Promise.all([
    buscarContratosExperiencia(empresas, 120),
    contagemGestores(),
  ]);

  const linhas = await appQuery<LinhaExperiencia>(
    `select e.id, e.codigoempresa, e.codigofunccontr, e.marco, e.status,
            r.recomendacao, r.respondido_por_nome,
            to_char(r.respondido_em, 'YYYY-MM-DD"T"HH24:MI:SS') as respondido_em,
            r.comentarios,
            (select to_char(max(l.enviado_em), 'YYYY-MM-DD"T"HH24:MI:SS')
               from rh_experiencia_lembrete l where l.experiencia_id = e.id) as ultimo_lembrete
       from rh_experiencia e
       left join rh_experiencia_resposta r on r.experiencia_id = e.id
      where e.codigoempresa = any($1::int[])`,
    [empresas]
  );
  const porChave = new Map<string, LinhaExperiencia>();
  for (const l of linhas) porChave.set(`${l.codigoempresa}|${l.codigofunccontr}|${l.marco}`, l);

  const hoje = hojeISO();
  const itens: ExperienciaItem[] = [];

  for (const c of contratos) {
    for (const marco of MARCOS) {
      const vencimento = addDias(c.dataadm, marco);
      const chave = `${c.codigoempresa}|${c.codigofunccontr}|${marco}`;
      const linha = porChave.get(chave);
      const diasParaVencer = diasEntre(hoje, vencimento);

      // Projetado (sem linha) só entra se relevante: recém-vencido pra frente.
      // Materializado entra sempre (está em andamento).
      if (!linha && diasParaVencer < -20) continue;

      // Status atual = a verdade de hoje: respondido manda; senão, vencido sem
      // resposta é atraso; senão o que o banco guarda (enviado/pendente); sem
      // linha ainda, pendente.
      const respondido = linha?.status === "respondido";
      const status: StatusExperiencia = respondido
        ? "respondido"
        : diasParaVencer < 0
          ? "atraso"
          : linha
            ? linha.status
            : "pendente";

      itens.push({
        id: linha?.id ?? null,
        codigoempresa: c.codigoempresa,
        contrato: c.codigofunccontr,
        nome: c.nome,
        cargo: c.cargo,
        setor: c.setor,
        classiforgan: c.classiforgan,
        dataadm: c.dataadm,
        marco,
        vencimento,
        status,
        diasParaVencer,
        gestores: gestores.get(c.classiforgan ?? "") ?? 0,
        ultimoLembrete: linha?.ultimo_lembrete ?? null,
        resposta:
          respondido && linha
            ? {
                recomendacao: linha.recomendacao ?? "",
                respondidoPor: linha.respondido_por_nome ?? "",
                respondidoEm: linha.respondido_em ?? "",
                comentarios: linha.comentarios,
              }
            : null,
      });
    }
  }

  // Mais urgente primeiro: respondidos ao fim; entre os demais, menor prazo (mais
  // atrasado) primeiro.
  return itens.sort((a, b) => {
    const ra = a.status === "respondido" ? 1 : 0;
    const rb = b.status === "respondido" ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return a.diasParaVencer - b.diasParaVencer;
  });
}

export interface ResumoCron {
  verificados: number;
  enviados: number;
  jaEnviados: number;
  semGestores: number;
  erros: number;
}

/**
 * Job diário: varre os contratos em experiência e dispara o lembrete DEVIDO de
 * cada marco. Por rodada, cada marco manda no máximo UM e-mail — o slot mais
 * próximo já alcançado (15→10→5→1 antes; 0 = atraso depois do vencimento) que
 * ainda não foi enviado. Assim um contrato que aparece já em cima da data não
 * leva os quatro lembretes de uma vez. Idempotente: rodar 2× no mesmo dia não
 * duplica (o log de lembrete tem unique por slot).
 */
export async function rodarCronExperiencia(
  empresas: number[] = [...EMPRESAS_RH]
): Promise<ResumoCron> {
  const contratos = await buscarContratosExperiencia(empresas, 120);
  const hoje = hojeISO();
  const resumo: ResumoCron = { verificados: 0, enviados: 0, jaEnviados: 0, semGestores: 0, erros: 0 };

  for (const c of contratos) {
    for (const marco of MARCOS) {
      const vencimento = addDias(c.dataadm, marco);
      const dias = diasEntre(hoje, vencimento);

      let slot: number;
      if (dias < 0) {
        slot = 0; // atraso: um aviso após o vencimento
      } else {
        const alcancados = [15, 10, 5, 1].filter((s) => dias <= s);
        if (alcancados.length === 0) continue; // ainda distante
        slot = Math.min(...alcancados);
      }

      resumo.verificados++;
      try {
        const r = await enviarFormularioExperiencia({ contrato: c, marco, vencimento, slot });
        if (r.enviado) resumo.enviados++;
        else if (r.jaEnviado) resumo.jaEnviados++;
        else if (r.semGestores) resumo.semGestores++;
        else resumo.enviados++; // registrado (driver de log sem SMTP)
      } catch (err) {
        resumo.erros++;
        console.error("[rh:cron] falha no marco", c.codigofunccontr, marco, err);
      }
    }
  }
  return resumo;
}

/** E-mails dos gestores ativos de um departamento (classiforgan). */
export async function gestoresDoSetor(classiforgan: string): Promise<string[]> {
  const rows = await appQuery<{ email: string }>(
    `select email from rh_setor_gestor where ativo and classiforgan = $1`,
    [classiforgan]
  );
  return rows.map((r) => r.email);
}

/**
 * Garante a linha rh_experiencia (empresa, contrato, marco), criando com token
 * se ainda não existe. Idempotente (o unique protege corrida). Devolve id+token.
 */
export async function materializarExperiencia(params: {
  codigoempresa: number;
  contrato: number;
  marco: Marco;
  dataadm: string;
  vencimento: string;
}): Promise<{ id: number; token: string }> {
  const [row] = await appQuery<{ id: number; token: string }>(
    `insert into rh_experiencia
        (codigoempresa, codigofunccontr, marco, data_admissao, data_vencimento, token)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (codigoempresa, codigofunccontr, marco) do update set atualizado_em = now()
     returning id, token`,
    [
      params.codigoempresa,
      params.contrato,
      params.marco,
      params.dataadm,
      params.vencimento,
      gerarToken(),
    ]
  );
  return row;
}

export interface ResultadoEnvio {
  enviado: boolean;
  jaEnviado?: boolean; // esse slot de lembrete já tinha sido disparado
  semGestores?: boolean; // setor sem gestor cadastrado — não há para quem enviar
  destinatarios: string[];
}

/**
 * Dispara (ou reenvia) o formulário de experiência de um marco. Materializa a
 * linha, resolve os gestores do setor, manda o e-mail e registra o lembrete.
 * `slot` é o dias-antes do disparo (15/10/5/1, 0 = atraso; -1 = reenvio manual).
 * Sem `forcado`, um slot já disparado não repete (o log tem unique por slot).
 */
export async function enviarFormularioExperiencia(opts: {
  contrato: ContratoExperiencia;
  marco: Marco;
  vencimento: string;
  slot: number;
  forcado?: boolean;
}): Promise<ResultadoEnvio> {
  const { contrato: c, marco, vencimento, slot, forcado } = opts;

  const { id, token } = await materializarExperiencia({
    codigoempresa: c.codigoempresa,
    contrato: c.codigofunccontr,
    marco,
    dataadm: c.dataadm,
    vencimento,
  });

  // Slot já disparado antes? (só trava o disparo automático; reenvio manual passa)
  if (!forcado) {
    const [ja] = await appQuery<{ um: number }>(
      `select 1 as um from rh_experiencia_lembrete where experiencia_id = $1 and dias_antes = $2`,
      [id, slot]
    );
    if (ja) return { enviado: false, jaEnviado: true, destinatarios: [] };
  }

  const destinatarios = await gestoresDoSetor(c.classiforgan ?? "");
  if (destinatarios.length === 0) {
    return { enviado: false, semGestores: true, destinatarios: [] };
  }

  const atrasado = diasEntre(hojeISO(), vencimento) < 0;
  const { assunto, html } = emailExperiencia({
    funcionario: c.nome,
    empresa: c.codigoempresa,
    cargo: c.cargo,
    setor: c.setor,
    marco,
    vencimento,
    token,
    atrasado,
  });
  const { enviado } = await enviarEmail({ para: destinatarios, assunto, html });

  // Registra o lembrete (idempotente por slot) e atualiza o status — sem
  // rebaixar quem já respondeu.
  await appQuery(
    `insert into rh_experiencia_lembrete (experiencia_id, dias_antes, destinatarios)
     values ($1, $2, $3)
     on conflict (experiencia_id, dias_antes)
       do update set enviado_em = now(), destinatarios = excluded.destinatarios`,
    [id, slot, destinatarios.join(", ")]
  );
  await appQuery(
    `update rh_experiencia set status = $2
      where id = $1 and status <> 'respondido'`,
    [id, atrasado ? "atraso" : "enviado"]
  );

  return { enviado, destinatarios };
}
