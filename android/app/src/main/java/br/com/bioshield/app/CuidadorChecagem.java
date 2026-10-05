package br.com.bioshield.app;

import android.app.job.JobParameters;
import android.app.job.JobService;

/**
 * Checagem periodica dos avisos de dose perdida do cuidador, chamada pelo JobScheduler do Android
 * a cada 15 minutos ou mais (o Android decide o momento exato).
 * Nao exige rede com internet: com o servidor numa rede local sem internet, ela roda do mesmo jeito.
 * A logica fica toda no VerificadorCuidador.
 */
public class CuidadorChecagem extends JobService {

    @Override
    public boolean onStartJob(JobParameters parametros) {
        // A consulta ao servidor nao pode rodar na linha principal do Android.
        new Thread(() -> {
            try {
                VerificadorCuidador.verificar(getApplicationContext());
            } finally {
                jobFinished(parametros, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters parametros) {
        // A proxima checagem ja esta agendada; nao precisa repetir esta.
        return false;
    }
}
