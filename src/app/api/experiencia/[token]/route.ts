import { NextRequest, NextResponse } from "next/server";
import { AppDbError } from "@/lib/app-db";
import { CRITERIOS_EXPERIENCIA, ESCALA } from "@/lib/rh-experiencia";
import { salvarRespostaExperiencia } from "@/lib/rh-experiencia-dados";

/**
 * Submissão PÚBLICA do formulário de experiência. Sem apiRoute (não exige
 * sessão) — o token é a credencial. Sanitiza os critérios (só chaves conhecidas,
 * valor 0..3) antes de gravar no jsonb.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const brutos = (body.criterios ?? {}) as Record<string, unknown>;
    const criterios: Record<string, number> = {};
    for (const c of CRITERIOS_EXPERIENCIA) {
      const v = Number(brutos[c.chave]);
      if (Number.isInteger(v) && v >= 0 && v < ESCALA.length) criterios[c.chave] = v;
    }

    const r = await salvarRespostaExperiencia(token, {
      respondidoPorNome: String(body.respondidoPorNome ?? ""),
      respondidoPorEmail: body.respondidoPorEmail ? String(body.respondidoPorEmail) : null,
      recomendacao: String(body.recomendacao ?? ""),
      criterios,
      comentarios: body.comentarios ? String(body.comentarios) : null,
    });
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[experiencia:submit]", err);
    const msg = err instanceof AppDbError ? err.message : "Falha ao salvar a avaliação";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
