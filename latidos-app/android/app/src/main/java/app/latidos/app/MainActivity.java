package app.latidos.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Sonda de huella Wi-Fi para clasificación interior/exterior (Latidos)
        registerPlugin(EnvProbePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
