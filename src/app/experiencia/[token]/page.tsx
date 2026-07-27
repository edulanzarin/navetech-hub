import { redirect } from "next/navigation";

/**
 * Legado: os formulários por token foram unificados em `/f/[token]`. Links de
 * e-mail antigos (`/experiencia/<token>`) continuam valendo — redirecionam.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/f/${token}`);
}
