// Interface do repositorio de usuario: o contrato do que eu preciso do banco.
// Escrevo aqui as assinaturas (cadastrar, buscar por email, buscar por id) e quem implementa e o infrastructure.
// Serve pra eu poder trocar MySQL por outro banco depois sem mexer no service.
export interface UsuarioRepository {
    cadastrar(usuario: any):Promise<void>;
    buscarPorEmail(email: string): Promise<any>;
    buscarPorId(id: number): Promise<any>;
}