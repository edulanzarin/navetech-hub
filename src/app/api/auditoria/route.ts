import { NextRequest, NextResponse } from "next/server";
import { getSessaoOpcional } from "@/lib/sessao";
import { registrarAuditoria } from "@/lib/auditoria";
import type { ModuloId } from "@/lib/modulos";

/**
 * Beacon de auditoria para eventos que só o CLIENTE conhece — hoje, exportações
 * (CSV/PDF disparadas no navegador). Exige sessão. A ação é DERIVADA do módulo
 * (`<modulo>.export`), nunca vem crua do corpo: um usuário logado não consegue
 * forjar um evento arbitrário na trilha. `alvo` é livre, mas truncado.
 */
const MODULOS_VALIDOS: ModuloId[] = ["fiscal", "contabil", "folha", "rh"];

export async function POST(req: NextRequest) {
  const sessao = await getSessaoOpcional();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { modulo?: string; alvo?: string; codigoempresa?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const modulo = body.modulo as ModuloId;
  if (!MODULOS_VALIDOS.includes(modulo)) {
    return NextResponse.json({ error: "Módulo inválido" }, { status: 400 });
  }
  const alvo = typeof body.alvo === "string" ? body.alvo.slice(0, 200) : undefined;
  const codigoempresa =
    Number.isInteger(body.codigoempresa) && (body.codigoempresa as number) > 0
      ? body.codigoempresa
      : null;

  await registrarAuditoria({ acao: `${modulo}.export`, modulo, alvo, codigoempresa });
  return NextResponse.json({ ok: true });
}
