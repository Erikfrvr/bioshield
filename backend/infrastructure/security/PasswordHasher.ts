// Hash de senha com bcrypt.
// E o unico lugar do projeto que conhece o bcryptjs. O service so pede "gera o hash" e "compara",
// assim se um dia o algoritmo mudar eu mexo so neste arquivo.
import bcrypt from "bcryptjs";

export class PasswordHasher {
  private saltRounds: number;

  constructor(saltRounds: number = 10) {
    this.saltRounds = saltRounds;
  }

  // Transforma a senha digitada no hash que vai pro banco
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Compara a senha digitada com o hash guardado. Nao existe "desfazer" o hash, so comparar.
  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}

const passwordHasher = new PasswordHasher();
export default passwordHasher;
