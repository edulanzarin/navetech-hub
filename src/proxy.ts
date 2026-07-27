import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/cookie-nome";

/**
 * Redirecionamento OTIMISTA para o login: sem cookie de sessão, uma página do
 * app manda para /login. É só conveniência — barato, sem tocar o banco na edge.
 * A tranca de verdade é `getSessao` (páginas/layouts) e `apiRoute` (rotas). As
 * rotas /api ficam de fora: quem não tem sessão recebe 401 em JSON, não um
 * redirect para uma página de login.
 *
 * `proxy` é a convenção nova do Next 16 (o antigo `middleware` foi renomeado).
 */
export function proxy(req: NextRequest) {
  if (req.cookies.get(COOKIE_SESSAO)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo, exceto: rotas de API, assets do Next, o próprio /login, os formulários
  // PÚBLICOS por token (`/f/...` unificado e o legado `/experiencia/...`,
  // respondidos sem login) e arquivos estáticos com extensão (logo, favicon...).
  // `f/` leva a barra de propósito: sem ela, pegaria /fiscal e /folha.
  matcher: ["/((?!api|_next/static|_next/image|login|experiencia|f/|.*\\.[\\w]+$).*)"],
};
