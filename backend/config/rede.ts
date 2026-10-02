// Endereco do servidor na rede local.
// O QR Code guarda um endereco completo. Se ele sair com "localhost", so abre no proprio servidor.
// Aqui eu descubro o endereco pelo qual os celulares do mesmo wifi enxergam este computador.
// Tambem serve pra mostrar no terminal, na subida, o endereco que o professor passa pra turma.
import dgram from "dgram";
import os from "os";

// Placas que existem no computador mas nao sao a rede de verdade: maquina virtual, Docker, VPN.
// Um celular no wifi nunca chega por elas.
const PLACA_VIRTUAL = /virtualbox|vmware|vethernet|hyper-v|docker|wsl|tailscale|zerotier|^veth|^br-|^virbr|^vboxnet|^tun|^tap/i;

// De quanto em quanto tempo eu confiro de novo o endereco. O roteador pode trocar o IP do computador.
const INTERVALO_MS = 60 * 1000;

let enderecoPrincipal: string | null = null;

// Todos os IPv4 da maquina que nao sao o proprio localhost, com a rede de verdade na frente.
// Um computador com cabo e wifi tem dois.
export function enderecosDaRede(): string[] {
  const reais: string[] = [];
  const virtuais: string[] = [];
  for (const [nome, placas] of Object.entries(os.networkInterfaces())) {
    for (const placa of placas ?? []) {
      if (placa.family !== "IPv4" || placa.internal) {
        continue;
      }
      (PLACA_VIRTUAL.test(nome) ? virtuais : reais).push(placa.address);
    }
  }

  const todos = [...reais, ...virtuais];
  if (enderecoPrincipal !== null && todos.includes(enderecoPrincipal)) {
    return [enderecoPrincipal, ...todos.filter((endereco) => endereco !== enderecoPrincipal)];
  }
  return todos;
}

// Pergunta ao sistema por qual placa ele sairia pra rede. E a placa ligada no roteador,
// e nao a de uma maquina virtual que por acaso aparece primeiro na lista.
// "Conectar" um soquete UDP nao manda nada pela rede: so faz o sistema escolher o caminho.
// Funciona mesmo com o roteador sem internet. Sem rede nenhuma, da erro e eu devolvo null.
function descobrirPrincipal(): Promise<string | null> {
  return new Promise((resolver) => {
    const soquete = dgram.createSocket("udp4");
    const terminar = (endereco: string | null) => {
      try {
        soquete.close();
      } catch {
        // ja estava fechado
      }
      resolver(endereco);
    };

    soquete.once("error", () => terminar(null));
    try {
      soquete.connect(53, "192.0.2.1", () => {
        const endereco = soquete.address().address;
        terminar(endereco && endereco !== "0.0.0.0" && !endereco.startsWith("127.") ? endereco : null);
      });
    } catch {
      terminar(null);
    }
  });
}

// Chamado na subida do servidor, e depois sozinho de tempos em tempos.
export async function atualizarEnderecoDaRede(): Promise<void> {
  enderecoPrincipal = await descobrirPrincipal();
}

// unref: esse relogio nao pode segurar o processo aberto na hora de desligar o servidor.
setInterval(() => {
  void atualizarEnderecoDaRede();
}, INTERVALO_MS).unref();

// O endereco que vai dentro do QR Code e que o app usa pra achar o servidor.
// Se o .env tiver URL_PUBLICA, vale ela: e o jeito de travar o endereco na mao.
// Sem ela, uso o IP da placa ligada na rede. Devolve null quando a maquina nao esta em rede nenhuma.
export function urlPublica(porta: number): string | null {
  const configurada = (process.env.URL_PUBLICA ?? "").trim().replace(/\/+$/, "");
  if (configurada !== "") {
    return configurada;
  }

  const enderecos = enderecosDaRede();
  return enderecos.length === 0 ? null : `http://${enderecos[0]}:${porta}`;
}
