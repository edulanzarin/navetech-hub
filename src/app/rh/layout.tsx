import { Suspense } from "react";
import { ModuloSidebar } from "@/components/sidebar";
import { assertAcesso, secoesVisiveis } from "@/lib/sessao";
import { RhShell } from "./shell";

function Fallback() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="skeleton h-10 w-48" />
      <div className="mt-5 skeleton h-9 w-full max-w-2xl" />
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
    </div>
  );
}

export default async function RhLayout({ children }: { children: React.ReactNode }) {
  // Gate otimista do módulo (a tranca de verdade é o apiRoute). Nega redirecionando.
  const sessao = await assertAcesso("rh");
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-60 shrink-0 border-r border-hairline bg-surface" />}>
        <ModuloSidebar
          moduloId="rh"
          visiveis={[...secoesVisiveis(sessao, "rh")]}
          usuario={{ id: sessao.usuario.id, nome: sessao.usuario.nome, temFoto: sessao.usuario.temAvatar }}
        />
      </Suspense>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<Fallback />}>
          <RhShell>{children}</RhShell>
        </Suspense>
      </main>
    </div>
  );
}
