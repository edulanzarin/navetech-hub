import { Contact } from "lucide-react";
import { carregarExperienciaPorToken } from "@/lib/rh-experiencia-dados";
import { Formulario } from "./formulario";

/**
 * Formulário PÚBLICO de avaliação de experiência — sem login, acessado pelo
 * token do link enviado ao gestor. Fora do matcher do proxy (ver proxy.ts) e
 * sem apiRoute na submissão: o token é a credencial.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dados = await carregarExperienciaPorToken(token);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-muted">
          <span className="grid size-8 place-items-center rounded-lg bg-ent/12 text-ent">
            <Contact className="size-4" />
          </span>
          <span className="text-sm font-medium">Navetech Hub · RH</span>
        </div>

        {!dados ? (
          <Aviso
            titulo="Link inválido"
            texto="Este link de avaliação não existe ou expirou. Verifique com o RH da Navecon."
          />
        ) : dados.jaRespondido ? (
          <Aviso
            titulo="Avaliação já respondida"
            texto={`A avaliação de experiência de ${dados.nome} já foi enviada. Obrigado!`}
          />
        ) : (
          <Formulario
            token={token}
            nome={dados.nome}
            empresa={dados.empresa}
            cargo={dados.cargo}
            setor={dados.setor}
            marco={dados.marco}
            vencimento={dados.vencimento}
          />
        )}
      </div>
    </div>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="card px-6 py-8 text-center">
      <h1 className="text-lg font-semibold text-ink">{titulo}</h1>
      <p className="mt-2 text-sm text-muted">{texto}</p>
    </div>
  );
}
