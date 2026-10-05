package br.com.bioshield.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Alarme exato marcado para o momento em que uma dose de quem o cuidador acompanha vira perdida
 * (o horario dela mais a tolerancia de 60 minutos). Quando toca, confere o servidor na hora.
 * E o que faz o aviso chegar cerca de um minuto depois, e nao so na proxima checagem periodica.
 */
public class CuidadorAlarme extends BroadcastReceiver {

    @Override
    public void onReceive(Context contexto, Intent intencao) {
        // goAsync segura o celular acordado enquanto a consulta roda fora da linha principal.
        PendingResult pendente = goAsync();
        Context aplicativo = contexto.getApplicationContext();
        new Thread(() -> {
            try {
                VerificadorCuidador.verificar(aplicativo);
            } finally {
                pendente.finish();
            }
        }).start();
    }
}
