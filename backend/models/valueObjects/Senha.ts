// Value object Senha: define o minimo de caracteres e as regras de forca.
// A senha so vira hash na camada de service, aqui eu cuido so da validacao.

export class Senha {
  private static readonly TAMANHO_MINIMO = 8;

  // O bcrypt ignora tudo que passa de 72 bytes, entao uma senha maior daria falsa sensacao de seguranca.
  // Conto em bytes e nao em letras porque acento e emoji ocupam mais de um byte.
  private static readonly TAMANHO_MAXIMO_BYTES = 72;

  private static readonly TEM_LETRA = /\p{L}/u;
  private static readonly TEM_NUMERO = /\d/;

  private readonly valor: string;

  // Diz se o valor guardado ja e o hash que veio do banco ou a senha que a pessoa digitou.
  private readonly hash: boolean;

  // Construtor privado: quem usa escolhe entre validar uma senha nova ou carregar um hash.
  private constructor(valor: string, hash: boolean) {
    this.valor = valor;
    this.hash = hash;
  }

  // Senha digitada pela pessoa no cadastro ou no login. Aqui passam todas as regras de forca.
  public static criar(senha: string): Senha {
    if (typeof senha !== "string" || senha.trim() === "") {
      throw new Error("A senha é obrigatória.");
    }

    // Nao faco trim na senha: espaco faz parte do que a pessoa escolheu.
    if (senha.length < Senha.TAMANHO_MINIMO) {
      throw new Error(`A senha precisa ter pelo menos ${Senha.TAMANHO_MINIMO} caracteres.`);
    }

    if (new TextEncoder().encode(senha).length > Senha.TAMANHO_MAXIMO_BYTES) {
      throw new Error("A senha é longa demais. Use no máximo 72 caracteres.");
    }

    if (!Senha.TEM_LETRA.test(senha) || !Senha.TEM_NUMERO.test(senha)) {
      throw new Error("A senha precisa ter pelo menos uma letra e um número.");
    }

    return new Senha(senha, false);
  }

  // Senha que ja saiu do bcrypt ou que veio do banco. Nao passa pelas regras de forca,
  // porque o hash nao e a senha, e so a impressao digital dela.
  public static aPartirDoHash(hash: string): Senha {
    if (typeof hash !== "string" || hash.trim() === "") {
      throw new Error("O hash da senha é obrigatório.");
    }

    return new Senha(hash, true);
  }

  public getValor(): string {
    return this.valor;
  }

  public ehHash(): boolean {
    return this.hash;
  }

  // Senha nunca aparece em log nem em console. Se alguem fizer console.log ou JSON.stringify
  // de um objeto que tem Senha dentro, sai so a mascara.
  public toString(): string {
    return "********";
  }

  public toJSON(): string {
    return "********";
  }
}

export default Senha;
