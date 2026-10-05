package br.com.bioshield.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Avisos de dose perdida no celular do cuidador (o lado web fica no frontEnd/js/avisosCuidador.js).
 *
 * Quando alguem que o cuidador acompanha passa 60 minutos sem confirmar uma dose, o servidor marca a dose
 * como perdida. Este arquivo consulta o servidor (GET /api/cuidadores/:id/alertas) e mostra um aviso para
 * cada dose perdida nova, mesmo com o app fechado. A consulta acontece de dois jeitos:
 *
 * 1. Um alarme exato em cada momento que o servidor informa (o horario de cada dose prevista mais a
 *    tolerancia). E o que faz o aviso chegar cerca de um minuto depois de a dose virar perdida.
 * 2. Uma checagem periodica pelo JobScheduler do Android, a cada 15 minutos ou mais, que pega o que o
 *    alarme perder (celular reiniciado, servidor fora do ar na hora) e refaz os alarmes.
 *
 * Nenhum dos dois exige rede com internet. O plugin oficial de tarefa em segundo plano exige, e por isso nao
 * serviria com o servidor numa rede local sem internet. Com o Tailscale Funnel funciona igual: o endereco
 * guardado e o https://....ts.net, e o HttpURLConnection fala HTTPS sem nada a mais.
 *
 * O endereco do servidor, o token de login e o id do cuidador ficam guardados no proprio aparelho
 * (SharedPreferences), e saem de la quando a pessoa sai da conta.
 */
final class VerificadorCuidador {

    /** Extra da abertura do app pelo toque no aviso. O CuidadorPlugin repassa para o avisosCuidador.js. */
    static final String EXTRA_AVISO = "bioshield_aviso_cuidador";

    private static final String PREFERENCIAS = "bioshield_cuidador";
    private static final String CANAL = "bioshield_cuidador";
    private static final int ID_CHECAGEM = 48151;
    // O Android nao aceita repeticao menor que 15 minutos.
    private static final long INTERVALO_CHECAGEM_MS = 15 * 60 * 1000L;
    private static final long FOLGA_CHECAGEM_MS = 5 * 60 * 1000L;
    private static final int CODIGO_ALARME_BASE = 73000;
    private static final int MAXIMO_ALARMES = 30;
    private static final int CODIGO_ABRIR_APP = 91000;
    private static final int MAXIMO_AVISADOS = 300;
    private static final int TEMPO_LIMITE_MS = 5000;
    // Os avisos do cuidador ficam num grupo proprio, com um resumo feito aqui. Sem isso, com dois avisos ou mais
    // o Android junta tudo num grupo automatico, e o toque nesse grupo abre o app na tela inicial, nao no painel.
    private static final String GRUPO = "bioshield_cuidador";
    // Fora da faixa dos avisos de dose (idDaNotificacao vai de -1 ate -2147483647) e da faixa do alarme (positivos).
    private static final int ID_RESUMO = Integer.MIN_VALUE;

    /** O que a consulta encontrou. ok fica falso quando o servidor nao respondeu. */
    static final class Resultado {
        boolean ok;
        int acompanha;
        int novos;
        JSONArray perdidas = new JSONArray();
    }

    private VerificadorCuidador() {}

    private static SharedPreferences preferencias(Context contexto) {
        return contexto.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }

    // ===== Configuracao =====

    static void configurar(Context contexto, String servidor, String token, long idCuidador) {
        preferencias(contexto).edit()
            .putString("servidor", servidor)
            .putString("token", token)
            .putLong("idCuidador", idCuidador)
            .apply();
    }

    /** Saiu da conta: para a checagem, apaga os alarmes, tira os avisos da barra e esquece o login. */
    static synchronized void desligar(Context contexto) {
        pararChecagem(contexto);
        NotificationManagerCompat notificacoes = NotificationManagerCompat.from(contexto);
        for (String chave : lerAvisados(contexto)) {
            notificacoes.cancel(idDaNotificacao(idDaDose(chave)));
        }
        notificacoes.cancel(ID_RESUMO);
        preferencias(contexto).edit().clear().apply();
    }

    private static void pararChecagem(Context contexto) {
        JobScheduler agendador = contexto.getSystemService(JobScheduler.class);
        if (agendador != null) {
            agendador.cancel(ID_CHECAGEM);
        }
        cancelarAlarmes(contexto);
    }

    // ===== Consulta ao servidor =====

    /**
     * Consulta o servidor e mostra os avisos novos. Roda fora da linha principal do Android: quem chama
     * (o alarme, a checagem periodica ou o plugin) ja abre uma linha de execucao propria.
     */
    static synchronized Resultado verificar(Context contexto) {
        Resultado resultado = new Resultado();
        SharedPreferences preferencias = preferencias(contexto);
        String servidor = preferencias.getString("servidor", null);
        String token = preferencias.getString("token", null);
        long idCuidador = preferencias.getLong("idCuidador", 0);
        if (servidor == null || token == null || idCuidador <= 0) {
            return resultado;
        }

        HttpURLConnection conexao = null;
        try {
            URL endereco = new URL(servidor + "/api/cuidadores/" + idCuidador + "/alertas");
            conexao = (HttpURLConnection) endereco.openConnection();
            conexao.setConnectTimeout(TEMPO_LIMITE_MS);
            conexao.setReadTimeout(TEMPO_LIMITE_MS);
            conexao.setRequestProperty("Accept", "application/json");
            conexao.setRequestProperty("Authorization", "Bearer " + token);

            int status = conexao.getResponseCode();
            if (status == 401 || status == 403) {
                // Login vencido ou de outra conta: para de conferir ate a pessoa entrar de novo.
                desligar(contexto);
                return resultado;
            }
            if (status != 200) {
                return resultado;
            }

            JSONObject resposta = new JSONObject(lerCorpo(conexao));
            resultado.ok = true;
            resultado.acompanha = resposta.optInt("acompanha", 0);
            JSONArray perdidas = resposta.optJSONArray("perdidas");
            resultado.perdidas = perdidas != null ? perdidas : new JSONArray();

            if (resultado.acompanha == 0) {
                // Nao acompanha ninguem: nao tem por que acordar o celular. O login fica, para quando acompanhar.
                pararChecagem(contexto);
                return resultado;
            }

            garantirChecagem(contexto);
            agendarAlarmes(contexto, resposta.optJSONArray("proximasVerificacoes"));
            resultado.novos = mostrar(contexto, resultado.perdidas, true);
            return resultado;
        } catch (Exception erro) {
            // Servidor fora do ar ou rede caiu: os alarmes e a checagem continuam, e a proxima tenta de novo.
            return resultado;
        } finally {
            if (conexao != null) {
                conexao.disconnect();
            }
        }
    }

    private static String lerCorpo(HttpURLConnection conexao) throws Exception {
        StringBuilder texto = new StringBuilder();
        try (BufferedReader leitor = new BufferedReader(new InputStreamReader(conexao.getInputStream(), StandardCharsets.UTF_8))) {
            String linha;
            while ((linha = leitor.readLine()) != null) {
                texto.append(linha);
            }
        }
        return texto.toString();
    }

    // ===== Avisos =====

    /**
     * Mostra um aviso para cada dose perdida que ainda nao foi avisada. Devolve quantos avisos novos saíram.
     * Com limparResolvidas, o aviso de uma dose que saiu da lista (foi confirmada depois, no "Tomei mesmo assim",
     * ou ficou velha) sai da barra.
     */
    static synchronized int mostrar(Context contexto, JSONArray perdidas, boolean limparResolvidas) {
        criarCanal(contexto);
        NotificationManagerCompat notificacoes = NotificationManagerCompat.from(contexto);
        boolean podeMostrar = notificacoes.areNotificationsEnabled();
        List<String> avisados = lerAvisados(contexto);
        List<String> naLista = new ArrayList<>();
        // O que esta na barra agora, acertado a cada aviso que entra ou sai. A lista do Android demora um
        // instante para refletir o notify e o cancel, entao no fim nao da para confiar nela.
        Set<Integer> naBarra = avisosNaBarra(contexto);
        int novos = 0;

        for (int i = 0; i < perdidas.length(); i++) {
            JSONObject alerta = perdidas.optJSONObject(i);
            if (alerta == null) {
                continue;
            }
            String chave = alerta.optLong("idDose") + "|" + alerta.optString("horarioPrevisto");
            naLista.add(chave);
            // Sem permissao, nao marca como avisado: quando a pessoa permitir, o aviso ainda sai.
            if (avisados.contains(chave) || !podeMostrar) {
                continue;
            }
            try {
                int id = idDaNotificacao(alerta.optLong("idDose"));
                notificacoes.notify(id, montarAviso(contexto, alerta));
                naBarra.add(id);
                avisados.add(chave);
                novos++;
            } catch (SecurityException erro) {
                // Permissao retirada no meio do caminho.
            }
        }

        if (limparResolvidas) {
            for (String chave : avisados) {
                if (!naLista.contains(chave)) {
                    int id = idDaNotificacao(idDaDose(chave));
                    notificacoes.cancel(id);
                    naBarra.remove(id);
                }
            }
        }

        atualizarResumo(contexto, naBarra.size(), podeMostrar);
        gravarAvisados(contexto, avisados);
        return novos;
    }

    // Os avisos do cuidador que estao na barra (id negativo, menos o resumo). Os do alarme do paciente sao positivos.
    private static Set<Integer> avisosNaBarra(Context contexto) {
        Set<Integer> ids = new HashSet<>();
        NotificationManager gerenciador = contexto.getSystemService(NotificationManager.class);
        if (gerenciador == null) {
            return ids;
        }
        try {
            for (StatusBarNotification aviso : gerenciador.getActiveNotifications()) {
                if (aviso.getId() < 0 && aviso.getId() != ID_RESUMO) {
                    ids.add(aviso.getId());
                }
            }
        } catch (RuntimeException erro) {
            // Sem a lista, o resumo e acertado na proxima consulta.
        }
        return ids;
    }

    // Com aviso do cuidador na barra, o grupo tem o resumo com o toque certo. Com um aviso so, o Android mostra
    // so o aviso; com dois ou mais, mostra o grupo. Sem nenhum, o resumo sai.
    private static void atualizarResumo(Context contexto, int quantos, boolean podeMostrar) {
        NotificationManagerCompat notificacoes = NotificationManagerCompat.from(contexto);
        if (quantos == 0 || !podeMostrar) {
            notificacoes.cancel(ID_RESUMO);
            return;
        }
        Notification resumo = new NotificationCompat.Builder(contexto, CANAL)
            .setSmallIcon(R.drawable.ic_stat_bioshield)
            .setColor(0xFFE8604C)
            .setContentTitle("Doses não confirmadas")
            .setContentText("Quem você acompanha não confirmou algumas doses. Toque para ver o painel do cuidador.")
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setGroup(GRUPO)
            .setGroupSummary(true)
            // Quem toca o som e vibra e cada aviso de dose. O resumo entra calado.
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setContentIntent(aoTocar(contexto))
            .build();
        try {
            notificacoes.notify(ID_RESUMO, resumo);
        } catch (SecurityException erro) {
            // Permissao retirada no meio do caminho.
        }
    }

    // O toque, no aviso ou no resumo, abre o app no painel do cuidador (avisosCuidador.js, pelo evento avisoTocado).
    private static PendingIntent aoTocar(Context contexto) {
        Intent abrir = new Intent(contexto, MainActivity.class);
        abrir.setAction(Intent.ACTION_MAIN);
        abrir.addCategory(Intent.CATEGORY_LAUNCHER);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        abrir.putExtra(EXTRA_AVISO, true);
        return PendingIntent.getActivity(
            contexto,
            CODIGO_ABRIR_APP,
            abrir,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static Notification montarAviso(Context contexto, JSONObject alerta) {
        String nome = alerta.optString("nomePaciente").trim();
        String primeiroNome = nome.isEmpty() ? "Quem você acompanha" : nome.split("\\s+")[0];
        String remedio = alerta.optString("nomeMedicamento");
        String hora = formatarHora(alerta.optString("horarioPrevisto"));
        String texto = primeiroNome + " não confirmou a dose de " + remedio + " das " + hora + ".";
        String textoLongo = nome + " não confirmou a dose de " + remedio + " das " + hora
            + ", e já passou 1 hora do horário. Vale conferir se está tudo bem.";

        return new NotificationCompat.Builder(contexto, CANAL)
            .setSmallIcon(R.drawable.ic_stat_bioshield)
            .setColor(0xFFE8604C)
            .setContentTitle("Dose não confirmada")
            .setContentText(texto)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(textoLongo))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            // No Android 7, que nao tem canal, som e vibracao vao no proprio aviso.
            .setSound(somDoAlarme(contexto))
            .setVibrate(new long[] { 0, 400, 200, 400 })
            .setGroup(GRUPO)
            .setAutoCancel(true)
            .setContentIntent(aoTocar(contexto))
            .build();
    }

    // O canal guarda o som e a importancia, e o Android nao deixa mudar depois de criado.
    // Importancia alta: o aviso desce da barra com som e vibracao.
    // Com a tela bloqueada o texto fica escondido, porque tem nome de pessoa e de remedio.
    private static void criarCanal(Context contexto) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager gerenciador = contexto.getSystemService(NotificationManager.class);
        if (gerenciador == null || gerenciador.getNotificationChannel(CANAL) != null) {
            return;
        }
        NotificationChannel canal = new NotificationChannel(CANAL, "Avisos do cuidador", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Avisa quando alguém que você acompanha passa 1 hora sem confirmar uma dose.");
        canal.enableVibration(true);
        canal.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        AudioAttributes atributos = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();
        canal.setSound(somDoAlarme(contexto), atributos);
        gerenciador.createNotificationChannel(canal);
    }

    private static Uri somDoAlarme(Context contexto) {
        return Uri.parse("android.resource://" + contexto.getPackageName() + "/" + R.raw.bioshield_alarme);
    }

    // Ids negativos: os positivos sao do alarme dos remedios do proprio paciente (lembretes.js).
    private static int idDaNotificacao(long idDose) {
        return (int) -(idDose % Integer.MAX_VALUE) - 1;
    }

    private static long idDaDose(String chave) {
        try {
            return Long.parseLong(chave.substring(0, chave.indexOf('|')));
        } catch (Exception erro) {
            return 0;
        }
    }

    private static List<String> lerAvisados(Context contexto) {
        String guardado = preferencias(contexto).getString("avisados", "");
        List<String> lista = new ArrayList<>();
        if (!guardado.isEmpty()) {
            lista.addAll(Arrays.asList(guardado.split(";")));
        }
        return lista;
    }

    private static void gravarAvisados(Context contexto, List<String> avisados) {
        List<String> ultimos = avisados.size() > MAXIMO_AVISADOS
            ? avisados.subList(avisados.size() - MAXIMO_AVISADOS, avisados.size())
            : avisados;
        preferencias(contexto).edit().putString("avisados", String.join(";", ultimos)).apply();
    }

    // ===== Checagem periodica =====

    private static void garantirChecagem(Context contexto) {
        JobScheduler agendador = contexto.getSystemService(JobScheduler.class);
        if (agendador == null || agendador.getPendingJob(ID_CHECAGEM) != null) {
            return;
        }
        JobInfo.Builder checagem = new JobInfo.Builder(ID_CHECAGEM, new ComponentName(contexto, CuidadorChecagem.class))
            .setPeriodic(INTERVALO_CHECAGEM_MS, FOLGA_CHECAGEM_MS);
        try {
            // Persistida: volta sozinha depois que o celular reinicia.
            agendador.schedule(checagem.setPersisted(true).build());
        } catch (IllegalArgumentException erro) {
            agendador.schedule(checagem.setPersisted(false).build());
        }
    }

    // ===== Alarmes exatos =====

    private static void agendarAlarmes(Context contexto, JSONArray momentos) {
        cancelarAlarmes(contexto);
        if (momentos == null) {
            return;
        }
        AlarmManager alarmes = contexto.getSystemService(AlarmManager.class);
        if (alarmes == null) {
            return;
        }
        boolean exato = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmes.canScheduleExactAlarms();
        long agora = System.currentTimeMillis();
        int usados = 0;
        for (int i = 0; i < momentos.length() && usados < MAXIMO_ALARMES; i++) {
            long quando = lerHorario(momentos.optString(i));
            if (quando <= agora) {
                continue;
            }
            PendingIntent alarme = pendenteDoAlarme(contexto, usados, PendingIntent.FLAG_UPDATE_CURRENT);
            try {
                // AllowWhileIdle: toca mesmo com o celular em repouso, e o Android libera a rede por alguns segundos.
                if (exato) {
                    alarmes.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando, alarme);
                } else {
                    alarmes.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando, alarme);
                }
            } catch (SecurityException erro) {
                alarmes.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando, alarme);
            }
            usados++;
        }
    }

    private static void cancelarAlarmes(Context contexto) {
        AlarmManager alarmes = contexto.getSystemService(AlarmManager.class);
        for (int i = 0; i < MAXIMO_ALARMES; i++) {
            PendingIntent alarme = pendenteDoAlarme(contexto, i, PendingIntent.FLAG_NO_CREATE);
            if (alarme != null) {
                if (alarmes != null) {
                    alarmes.cancel(alarme);
                }
                alarme.cancel();
            }
        }
    }

    private static PendingIntent pendenteDoAlarme(Context contexto, int posicao, int marcas) {
        Intent intencao = new Intent(contexto, CuidadorAlarme.class);
        return PendingIntent.getBroadcast(contexto, CODIGO_ALARME_BASE + posicao, intencao, marcas | PendingIntent.FLAG_IMMUTABLE);
    }

    // ===== Datas =====

    // A API manda os horarios em ISO com Z, em UTC: "2026-10-05T11:00:00.000Z".
    private static long lerHorario(String valorIso) {
        try {
            SimpleDateFormat formato = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            formato.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date data = formato.parse(valorIso);
            return data != null ? data.getTime() : 0;
        } catch (Exception erro) {
            return 0;
        }
    }

    // Na hora do aparelho, igual as telas.
    private static String formatarHora(String valorIso) {
        long momento = lerHorario(valorIso);
        if (momento == 0) {
            return "";
        }
        return new SimpleDateFormat("HH:mm", Locale.forLanguageTag("pt-BR")).format(new Date(momento));
    }
}
