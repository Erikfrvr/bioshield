package br.com.bioshield.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin do proprio projeto: os avisos de dose perdida do cuidador (CuidadorPlugin).
        // Tem que ser registrado antes do super.onCreate, que e onde o Capacitor monta a ponte.
        registerPlugin(CuidadorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
