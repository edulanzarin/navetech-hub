import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota só o necessário em .next/standalone — imagem Docker menor e sem
  // precisar de node_modules no runtime.
  output: "standalone",
  experimental: {
    // Upload de foto de perfil via Server Action passa do 1MB padrão. Folga
    // acima do teto de 2 MB do avatar: assim a validação amigável do servidor
    // ("máximo 2 MB") rejeita antes de estourar como 413 no corpo do request.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
