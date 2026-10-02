// Interface do repositorio de usuario: o contrato do que eu preciso do banco.
// Escrevo aqui as assinaturas (cadastrar, buscar por email, buscar por id) e quem implementa e o infrastructure.
// Serve pra eu poder trocar MySQL por outro banco depois sem mexer no service.
import Usuario from "../models/entidade/Usuario";

export interface UsuarioRepository {
    // Grava a conta e devolve o id gerado dentro da entidade
    cadastrar(usuario: Usuario): Promise<void>;
    // null quando nao existe conta com esse email
    buscarPorEmail(email: string): Promise<Usuario | null>;
    // null quando nao existe conta com esse id
    buscarPorId(id: number): Promise<Usuario | null>;
    // Devolve o id da ficha medica desse usuario, ou null se ele ainda nao criou a ficha
    buscarIdPaciente(idUsuario: number): Promise<number | null>;
}