package br.com.bioshield.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins do proprio projeto: os avisos de dose perdida do cuidador (CuidadorPlugin)
        // e imprimir e guardar as etiquetas do QR Code (ArquivosPlugin).
        // Tem que ser registrado antes do super.onCreate, que e onde o Capacitor monta a ponte.
        registerPlugin(CuidadorPlugin.class);
        registerPlugin(ArquivosPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
