package br.com.bioshield.app;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre as telas (frontEnd/js/avisosCuidador.js) e os avisos de dose perdida do cuidador.
 * As telas chamam pelo nome BioShieldCuidador. Registrado no MainActivity.
 *
 * configurar     guarda o servidor, o login e o cuidador, confere na hora e liga a checagem
 * mostrarAlertas mostra avisos que as telas ja calcularam (modo demonstracao, que nao tem servidor)
 * desligar       para tudo, ao sair da conta
 * avisoTocado    evento para as telas quando o app abre pelo toque num aviso
 */
@CapacitorPlugin(name = "BioShieldCuidador")
public class CuidadorPlugin extends Plugin {

    @PluginMethod
    public void configurar(PluginCall chamada) {
        String servidor = chamada.getString("servidor");
        String token = chamada.getString("token");
        Double idCuidador = chamada.getDouble("idCuidador");
        if (servidor == null || token == null || idCuidador == null) {
            chamada.reject("Faltam o servidor, o login ou o cuidador.");
            return;
        }

        Context contexto = getContext();
        VerificadorCuidador.configurar(contexto, servidor.replaceAll("/+$", ""), token, idCuidador.longValue());
        new Thread(() -> chamada.resolve(paraTelas(VerificadorCuidador.verificar(contexto)))).start();
    }

    @PluginMethod
    public void mostrarAlertas(PluginCall chamada) {
        JSArray alertas = chamada.getArray("alertas");
        if (alertas == null) {
            chamada.reject("Faltam os alertas.");
            return;
        }
        JSObject resposta = new JSObject();
        resposta.put("novos", VerificadorCuidador.mostrar(getContext(), alertas, false));
        chamada.resolve(resposta);
    }

    @PluginMethod
    public void desligar(PluginCall chamada) {
        VerificadorCuidador.desligar(getContext());
        chamada.resolve();
    }

    // O Capacitor repassa aqui a abertura do app, inclusive com o app fechado (partida a frio).
    // O evento fica guardado ate a tela registrar o ouvinte.
    @Override
    protected void handleOnNewIntent(Intent intencao) {
        super.handleOnNewIntent(intencao);
        if (intencao != null && intencao.getBooleanExtra(VerificadorCuidador.EXTRA_AVISO, false)) {
            intencao.removeExtra(VerificadorCuidador.EXTRA_AVISO);
            notifyListeners("avisoTocado", new JSObject(), true);
        }
    }

    private static JSObject paraTelas(VerificadorCuidador.Resultado resultado) {
        JSObject resposta = new JSObject();
        resposta.put("ok", resultado.ok);
        resposta.put("acompanha", resultado.acompanha);
        resposta.put("novos", resultado.novos);
        resposta.put("perdidas", resultado.perdidas);
        return resposta;
    }
}
