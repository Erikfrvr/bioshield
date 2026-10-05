// Ponto de entrada da API.
// Aqui eu subo o Express, carrego o .env, ligo o cors e o parse de json,
// e registro todas as rotas embaixo do prefixo /api.
// O mesmo servidor entrega as telas da pasta frontEnd, entao uma porta so atende o site, o app e a API.
// Regra minha: server.ts nao tem regra de negocio, so liga as pecas.

// Primeiro import de todos: acerta o fuso do Node antes de qualquer arquivo montar data.
import "./config/fuso";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { bancoRespondendo } from "./config/db";
import {
  atualizarEnderecoDaRede,
  ehEnderecoTailscale,
  enderecosDaRede,
  urlPublica,
  urlPublicaConfigurada,
} from "./config/rede";
import usuarioRoutes from "./routes/usuarioRoutes";
import pacienteRoutes from "./routes/pacienteRoutes";
import emergenciaRoutes from "./routes/emergenciaRoutes";
import medicamentoRoutes from "./routes/medicamentoRoutes";
import doseRoutes from "./routes/doseRoutes";
import cuidadorRoutes from "./routes/cuidadorRoutes";

dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 3000;

const app = express();

// O Tailscale Funnel recebe o acesso da internet e repassa para ca de dentro do proprio computador (127.0.0.1),
// com o IP de verdade de quem escaneou no cabecalho X-Forwarded-For.
// "loopback" faz o Express acreditar nesse cabecalho so quando o pedido vem do proprio computador.
// Assim o historico de acessos da LGPD grava o IP do visitante, e um celular do wifi, que chega direto,
// nao consegue inventar um IP mandando esse cabecalho.
app.set("trust proxy", "loopback");

app.use(cors());
app.use(express.json());

// O front chama esta rota pra saber se a API esta de pe.
// urlPublica e o endereco pelo qual os celulares enxergam este servidor: o front usa ele
// pra montar o QR Code, assim o codigo nunca sai apontando pra "localhost".
// banco diz se o MySQL respondeu. O front so olha o status; o banco e pra conferir no dia, abrindo esta rota no celular.
app.get("/api/status", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    status: "ok",
    urlPublica: urlPublica(PORT),
    banco: (await bancoRespondendo()) ? "ok" : "fora do ar",
  });
});

// Todos os routers ficam registrados aqui de uma vez, mesmo os que ainda estao vazios.
// Cada router ja escreve o caminho completo (/usuarios, /pacientes...), entao o prefixo e so /api.
// Quem for criar rota nova mexe so no arquivo de rotas dele, nao precisa abrir o server.ts.
app.use("/api", usuarioRoutes);
app.use("/api", pacienteRoutes);
app.use("/api", emergenciaRoutes);
app.use("/api", medicamentoRoutes);
app.use("/api", doseRoutes);
app.use("/api", cuidadorRoutes);

// Caminho de API que nao existe responde em JSON, igual as outras rotas, e nao com a pagina de erro do Express.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ mensagem: "Rota não encontrada." });
});

// As telas. A pasta frontEnd fica ao lado da pasta backend, e o nome tem que ser escrito igualzinho:
// no Linux "frontEnd" e "frontend" sao pastas diferentes.
// no-cache faz o navegador conferir se o arquivo mudou antes de usar a copia guardada,
// senao um celular que ja abriu o site continua com a tela antiga depois de uma atualizacao.
app.use(express.static(path.join(__dirname, "..", "frontEnd"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-cache");
  },
}));

// Tratador de erro geral. Tem que ficar depois das rotas e ter os quatro parametros, senao o Express nao reconhece.
// Sem ele, um JSON quebrado faz o Express escrever no console um pedaco do corpo da requisicao,
// que pode ser dado de saude, e devolver para o cliente os caminhos das pastas do servidor.
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = erro as { type?: string; name?: string };

  if (e?.type === "entity.parse.failed") {
    res.status(400).json({ mensagem: "O corpo da requisição não é um JSON válido." });
    return;
  }

  if (e?.type === "entity.too.large") {
    res.status(413).json({ mensagem: "O corpo da requisição é grande demais." });
    return;
  }

  // So o tipo ou o nome do erro, nunca a mensagem nem o corpo
  console.error("Erro nao tratado no servidor:", e?.type ?? e?.name ?? "desconhecido");
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
});

// Confere o .env na subida e avisa no terminal o que vai dar problema.
// So avisa, nao derruba o servidor: no dia, um servidor de pe com aviso e melhor que nenhum.
function avisarConfiguracao(): void {
  const segredo = process.env.JWT_SECRET ?? "";
  if (segredo === "") {
    console.log("ATENCAO: falta o JWT_SECRET no .env. Ninguem vai conseguir entrar no app.");
  } else if (segredo === "troque_esse_valor" || segredo.length < 32) {
    console.log("ATENCAO: o JWT_SECRET do .env e o do exemplo ou e curto demais.");
    console.log("  Com o Tailscale Funnel o BioShield fica aberto na internet. Troque por um texto longo, de 32 letras ou mais.");
  }

  const configurada = urlPublicaConfigurada();
  if (configurada !== "" && ehEnderecoTailscale(configurada)) {
    console.log("Tailscale Funnel: confira se ele esta ligado com o comando  tailscale funnel status");
    console.log(`  Ele precisa mostrar ${configurada} levando para a porta ${PORT}.`);
  }
}

// Sem endereco no listen o Express atende em todas as placas de rede, e nao so no localhost.
// E isso que deixa o celular do mesmo wifi chegar aqui.
app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  avisarConfiguracao();

  await atualizarEnderecoDaRede();
  const enderecos = enderecosDaRede();
  if (enderecos.length === 0) {
    console.log("Este computador nao esta em nenhuma rede. So ele mesmo consegue abrir o BioShield.");
  } else {
    console.log("Nos celulares e nos outros computadores da mesma rede, use:");
    for (const endereco of enderecos) {
      console.log(`  http://${endereco}:${PORT}`);
    }
  }

  const noQr = urlPublica(PORT);
  if (noQr === null) {
    return;
  }
  console.log(`Endereco que vai dentro do QR Code: ${noQr}`);
  if (!noQr.startsWith("https://")) {
    console.log("  Esse endereco so abre para quem estiver no mesmo wifi. Para abrir pelo 4G com o Tailscale Funnel,");
    console.log("  coloque o endereco dele no URL_PUBLICA do .env (veja docs/SERVIDOR_ONLINE.md).");
  }
});
