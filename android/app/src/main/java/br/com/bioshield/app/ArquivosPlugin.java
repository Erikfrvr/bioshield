package br.com.bioshield.app;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import androidx.annotation.RequiresApi;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Ponte entre a tela de etiquetas (frontEnd/js/imprimir.js) e o Android, para imprimir e guardar arquivos.
 * A janela do app nao imprime pelo window.print e nao baixa arquivo pelo link de download,
 * entao a tela chama este plugin pelo nome BioShieldArquivos. Registrado no MainActivity.
 *
 * imprimir     abre a janela de impressao do Android com a pagina atual. Ela tambem tem "Salvar como PDF"
 * salvar       grava o arquivo na pasta Download/BioShield (Android 10 em diante). No Android 9 ou antes,
 *              gravar ali pediria permissao, entao abre a janela de compartilhar para a pessoa escolher onde guardar
 * abrir        abre um arquivo salvo com o app que o celular tiver para aquele tipo
 * compartilhar abre a janela de compartilhar do Android (WhatsApp, Drive, email, impressora)
 */
@CapacitorPlugin(name = "BioShieldArquivos")
public class ArquivosPlugin extends Plugin {

    private static final String PASTA = "BioShield";
    // Pasta dentro do cache do app de onde os arquivos saem para a janela de compartilhar.
    // O FileProvider do manifesto (res/xml/file_paths.xml) libera o cache inteiro.
    private static final String PASTA_COMPARTILHAR = "compartilhar";

    @PluginMethod
    public void imprimir(PluginCall chamada) {
        String titulo = chamada.getString("titulo", "BioShield");
        // A WebView so pode ser mexida na linha principal do Android.
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager impressao = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView janela = getBridge().getWebView();
                PrintDocumentAdapter adaptador = janela.createPrintDocumentAdapter(titulo);
                PrintAttributes atributos = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .build();
                impressao.print(titulo, adaptador, atributos);
                chamada.resolve();
            } catch (Exception erro) {
                chamada.reject("Não consegui abrir a impressão do Android.");
            }
        });
    }

    @PluginMethod
    public void salvar(PluginCall chamada) {
        String nome = chamada.getString("nome");
        String tipo = chamada.getString("tipo");
        String base64 = chamada.getString("base64");
        if (nome == null || tipo == null || base64 == null) {
            chamada.reject("Faltam o nome, o tipo ou o conteúdo do arquivo.");
            return;
        }

        // Decodificar e gravar um PDF leva um tempinho: fora da linha principal, para a tela nao travar.
        new Thread(() -> {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                String nomeLimpo = nomeSeguro(nome);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    chamada.resolve(salvarEmDownload(nomeLimpo, tipo, bytes));
                    return;
                }
                compartilharBytes(nomeLimpo, tipo, bytes, "Guardar o arquivo");
                JSObject resposta = new JSObject();
                resposta.put("salvo", false);
                resposta.put("nome", nomeLimpo);
                chamada.resolve(resposta);
            } catch (Exception erro) {
                chamada.reject("Não consegui salvar o arquivo no celular.");
            }
        }).start();
    }

    @PluginMethod
    public void abrir(PluginCall chamada) {
        String uri = chamada.getString("uri");
        String tipo = chamada.getString("tipo");
        if (uri == null || tipo == null) {
            chamada.reject("Falta o arquivo para abrir.");
            return;
        }

        Intent intencao = new Intent(Intent.ACTION_VIEW);
        intencao.setDataAndType(Uri.parse(uri), tipo);
        intencao.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(intencao);
            chamada.resolve();
        } catch (ActivityNotFoundException erro) {
            chamada.reject("Este celular não tem um app para abrir esse arquivo. Ele está na pasta Download, dentro de BioShield.");
        }
    }

    @PluginMethod
    public void compartilhar(PluginCall chamada) {
        String nome = chamada.getString("nome");
        String tipo = chamada.getString("tipo");
        String base64 = chamada.getString("base64");
        String titulo = chamada.getString("titulo", "Compartilhar");
        if (nome == null || tipo == null || base64 == null) {
            chamada.reject("Faltam o nome, o tipo ou o conteúdo do arquivo.");
            return;
        }

        new Thread(() -> {
            try {
                compartilharBytes(nomeSeguro(nome), tipo, Base64.decode(base64, Base64.DEFAULT), titulo);
                chamada.resolve();
            } catch (Exception erro) {
                chamada.reject("Não consegui abrir a janela de compartilhar.");
            }
        }).start();
    }

    // Android 10 em diante: o MediaStore deixa o app gravar na pasta Download sem pedir permissao nenhuma.
    // O arquivo fica marcado como pendente enquanto e escrito, para nenhum outro app pegar ele pela metade.
    @RequiresApi(Build.VERSION_CODES.Q)
    private JSObject salvarEmDownload(String nome, String tipo, byte[] bytes) throws IOException {
        ContentResolver resolvedor = getContext().getContentResolver();
        String pasta = Environment.DIRECTORY_DOWNLOADS + "/" + PASTA;

        ContentValues valores = new ContentValues();
        valores.put(MediaStore.Downloads.DISPLAY_NAME, nome);
        valores.put(MediaStore.Downloads.MIME_TYPE, tipo);
        valores.put(MediaStore.Downloads.RELATIVE_PATH, pasta);
        valores.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri endereco = resolvedor.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, valores);
        if (endereco == null) throw new IOException("O Android não criou o arquivo.");

        try (OutputStream saida = resolvedor.openOutputStream(endereco)) {
            if (saida == null) throw new IOException("O Android não abriu o arquivo.");
            saida.write(bytes);
        } catch (IOException erro) {
            resolvedor.delete(endereco, null, null);
            throw erro;
        }

        ContentValues pronto = new ContentValues();
        pronto.put(MediaStore.Downloads.IS_PENDING, 0);
        resolvedor.update(endereco, pronto, null, null);

        // Se ja existia um arquivo com o mesmo nome, o Android acrescenta um numero. Devolvo o nome que ficou.
        String nomeFinal = nome;
        try (Cursor cursor = resolvedor.query(endereco, new String[] { MediaStore.Downloads.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst() && cursor.getString(0) != null) {
                nomeFinal = cursor.getString(0);
            }
        }

        JSObject resposta = new JSObject();
        resposta.put("salvo", true);
        resposta.put("nome", nomeFinal);
        resposta.put("pasta", pasta);
        resposta.put("uri", endereco.toString());
        return resposta;
    }

    // Grava no cache do app e abre a janela de compartilhar. Os arquivos antigos dessa pasta saem antes,
    // para o cache nao crescer a cada compartilhamento.
    private void compartilharBytes(String nome, String tipo, byte[] bytes, String titulo) throws IOException {
        Context contexto = getContext();
        File pasta = new File(contexto.getCacheDir(), PASTA_COMPARTILHAR);
        if (!pasta.exists() && !pasta.mkdirs()) throw new IOException("Sem pasta para compartilhar.");
        File[] antigos = pasta.listFiles();
        if (antigos != null) {
            for (File antigo : antigos) {
                //noinspection ResultOfMethodCallIgnored
                antigo.delete();
            }
        }

        File arquivo = new File(pasta, nome);
        try (FileOutputStream saida = new FileOutputStream(arquivo)) {
            saida.write(bytes);
        }

        Uri endereco = FileProvider.getUriForFile(contexto, contexto.getPackageName() + ".fileprovider", arquivo);
        Intent envio = new Intent(Intent.ACTION_SEND);
        envio.setType(tipo);
        envio.putExtra(Intent.EXTRA_STREAM, endereco);
        // O ClipData faz a permissao de leitura chegar tambem na previa da janela de compartilhar.
        envio.setClipData(ClipData.newRawUri(nome, endereco));
        envio.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        Intent escolha = Intent.createChooser(envio, titulo);
        escolha.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(escolha);
    }

    // Tira do nome as letras que o Android nao aceita em nome de arquivo.
    private static String nomeSeguro(String nome) {
        String limpo = nome.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return limpo.isEmpty() ? "BioShield" : limpo;
    }
}
