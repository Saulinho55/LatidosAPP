package app.latidos.app;

import android.Manifest;
import android.content.Context;
import android.net.wifi.WifiManager;
import android.net.wifi.ScanResult;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;

import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

/**
 * EnvProbe: sonda nativa de huella Wi-Fi para clasificar interior/exterior.
 *
 * - getNetworks(): devuelve las APs visibles (bssid resumido + rssi).
 *   No se añade ningún permiso nuevo: reutiliza ACCESS_FINE_LOCATION,
 *   que la app ya pide para el GPS de rutas. Sin ese permiso, devuelve
 *   lista vacía y el clasificador JS queda neutral (nunca penaliza).
 *
 * - startAutoScan(2s): publica periódicamente en el WebView
 *   window.__latidosScan = { ts, networks:[{bssid,rssi}] } que consume
 *   src/utils/outdoorDetector.js. Best-effort: cualquier fallo se ignora.
 */
@CapacitorPlugin(name = "EnvProbe")
public class EnvProbePlugin extends Plugin {

    private Timer scanTimer;

    @Override
    public void load() {
        // Arranque suave: si hay permiso de ubicación, escaneo automático.
        try {
            startPolling();
        } catch (Exception ignored) { }
    }

    @PluginMethod
    public void getNetworks(PluginCall call) {
        if (!hasPermission(call)) {
            requestPermissionForPlugin();
            call.resolve(new JSObject().put("networks", new JSONArray()));
            return;
        }
        call.resolve(new JSObject().put("networks", scan()));
    }

    @Permission(label = "globalLocation", id = "globalLocation",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    @PermissionCallback
    private void permissionRetrieved(PluginCall call) {
        // Si el usuario concedió, reintentar el polling automático
        try { startPolling(); } catch (Exception ignored) { }
    }

    private void startPolling() {
        if (scanTimer != null) return;
        scanTimer = new Timer(true);
        scanTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    if (!hasPermission(null)) return;
                    final JSONArray nets = scan();
                    if (nets == null || nets.length() == 0) return;
                    final String json = nets.toString();
                    getActivity().runOnUiThread(() -> {
                        if (bridge == null || bridge.getWebView() == null) return;
                        bridge.getWebView().evaluateJavascript(
                            "window.__latidosScan={ts:Date.now(),networks:" + json + "};",
                            null
                        );
                    });
                } catch (Exception ignored) { }
            }
        }, 3000, 5000);
    }

    private JSONArray scan() {
        try {
            WifiManager wm = (WifiManager) getContext().getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wm == null) return new JSONArray();
            List<ScanResult> results = wm.getScanResults();
            JSONArray arr = new JSONArray();
            if (results != null) {
                for (ScanResult r : results) {
                    JSObject o = new JSObject();
                    // BSSID resumido: no exponemos el MAC completo al JS
                    String b = r.BSSID == null ? "?" : r.BSSID.toUpperCase();
                    o.put("bssid", b.length() > 8 ? b.substring(0, 8) : b);
                    o.put("rssi", r.level);
                    arr.put(o);
                    if (arr.length() >= 40) break;
                }
            }
            return arr;
        } catch (SecurityException e) {
            return new JSONArray();
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
