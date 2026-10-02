// O que chega pra criar o vinculo: o codigo de autorizacao que o paciente gerou.
// O paciente nao vem no corpo, quem aponta pra ele e o codigo (POST /api/cuidadores/vincular).

export interface VincularCuidadorDTO {
    // O front ainda manda, mas o backend ignora: o cuidador e sempre quem esta logado (req.idUsuario).
    // Se valesse o que vem aqui, daria pra vincular a conta de outra pessoa.
    idCuidador?: number;
    codigo: string;
}
