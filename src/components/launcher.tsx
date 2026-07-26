import Link from "next/link";
import Image from "next/image";
import { LogOut, ShieldCheck } from "lucide-react";
import { MODULOS, type ModuloId } from "@/lib/modulos";
import { sair } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";

/**
 * Primeira tela depois do login: escolher o módulo. É também a primeira porta
 * de permissão — só entram na grade os módulos que a sessão libera (`acessiveis`
 * vem do perfil no servidor). Módulo ainda por vir aparece como "em breve", pra
 * sinalizar o roteiro sem prometer o que não abre. Admin ganha um card extra de
 * administração; os demais nem o veem.
 *
 * Card icônico: o ícone grande é o foco, o título vem abaixo. A descrição não
 * ocupa espaço — fica só no tooltip (title), pra tela respirar.
 */
export function Launcher({
  usuario,
  usuarioId,
  usuarioTemFoto,
  acessiveis,
  admin,
}: {
  usuario: string;
  usuarioId: string;
  usuarioTemFoto: boolean;
  acessiveis: ModuloId[];
  admin: boolean;
}) {
  const acesso = new Set(acessiveis);
  // Ativo e liberado vira card clicável; inativo vira "em breve"; ativo sem
  // acesso não aparece — o launcher só mostra o que a pessoa pode abrir.
  const visiveis = MODULOS.filter((m) => !m.ativo || acesso.has(m.id));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="Navetech Hub" width={36} height={36} className="size-9" />
          <p className="text-sm font-semibold tracking-tight">Navetech Hub</p>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle label={false} />
          <form action={sair}>
            <button
              type="submit"
              title="Sair"
              className="flex size-9 items-center justify-center rounded-lg border border-hairline text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-16">
        <div className="flex items-center gap-3">
          <Avatar id={usuarioId} nome={usuario} temFoto={usuarioTemFoto} size={44} />
          <div>
            <p className="text-sm text-muted">Bem-vindo,</p>
            <p className="text-sm font-semibold">{usuario}</p>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Escolha um módulo</h1>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {visiveis.map((m) => {
            if (!m.ativo) {
              return (
                <div
                  key={m.id}
                  title={m.descricao}
                  aria-disabled
                  className="card anim-scale-in flex flex-col items-center gap-4 px-6 py-8 text-center opacity-55"
                >
                  <Image
                    src="/images/logo.png"
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 opacity-60 grayscale"
                  />
                  <div>
                    <p className="text-base font-semibold">{m.titulo}</p>
                    <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide text-muted">
                      em breve
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={m.id}
                href={m.home}
                title={m.descricao}
                className="card anim-scale-in group flex flex-col items-center gap-4 px-6 py-8 text-center transition-colors hover:border-ent/40 hover:bg-surface-2"
              >
                <Image
                  src={m.icone}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="size-16 transition-transform group-hover:scale-105"
                />
                <p className="text-base font-semibold">{m.titulo}</p>
              </Link>
            );
          })}

          {admin && (
            <Link
              href="/admin"
              title="Usuários, permissões e grupos de empresa"
              className="card anim-scale-in group flex flex-col items-center gap-4 px-6 py-8 text-center transition-colors hover:border-ent/40 hover:bg-surface-2"
            >
              <ShieldCheck className="size-16 text-muted transition-colors group-hover:text-ent" strokeWidth={1.25} />
              <p className="text-base font-semibold">Administração</p>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
