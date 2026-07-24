import Link from "next/link";
import Image from "next/image";
import { Briefcase, Building2, ChevronLeft, Layers, LogOut, Users } from "lucide-react";
import { assertAdmin } from "@/lib/sessao";
import { sair } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Área administrativa: fora do catálogo de módulos de negócio, só para admin.
 * O gate real é `assertAdmin` aqui e no `apiRoute`/actions; a casca abaixo é a
 * navegação.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertAdmin();

  const link = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-hairline bg-surface px-3 py-5">
        <Link href="/" className="flex items-center gap-1.5 px-2 text-xs text-muted transition-colors hover:text-ink">
          <ChevronLeft className="size-3.5" />
          Voltar ao Hub
        </Link>

        <div className="mt-3 flex items-center gap-2.5 px-2">
          <Image src="/logo.png" alt="" width={36} height={36} className="size-9" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Administração</p>
            <p className="text-[11px] text-muted">Navetech Hub</p>
          </div>
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-0.5">
          <Link href="/admin/usuarios" className={link}>
            <Users className="size-4 shrink-0" />
            Usuários
          </Link>
          <Link href="/admin/cargos" className={link}>
            <Briefcase className="size-4 shrink-0" />
            Cargos
          </Link>
          <Link href="/admin/setores" className={link}>
            <Building2 className="size-4 shrink-0" />
            Setores
          </Link>
          <Link href="/admin/grupos" className={link}>
            <Layers className="size-4 shrink-0" />
            Grupos de empresa
          </Link>
        </nav>

        <div className="mt-2 flex flex-col gap-0.5 border-t border-hairline pt-2">
          <ThemeToggle />
          <form action={sair}>
            <button type="submit" className={`${link} w-full`}>
              <LogOut className="size-4 shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
