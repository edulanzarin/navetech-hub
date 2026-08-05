import { Suspense } from "react";
import { ShellPublico } from "@/components/shell-publico";
import { AcompanharView } from "./acompanhar-view";

/**
 * Acompanhamento PÚBLICO da denúncia por protocolo+senha (sem login). O `p` da
 * URL pré-preenche o protocolo vindo do recibo — daí o Suspense (useSearchParams).
 */
export default function Page() {
  return (
    <ShellPublico>
      <Suspense>
        <AcompanharView />
      </Suspense>
    </ShellPublico>
  );
}
