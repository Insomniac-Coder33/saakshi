package com.quietcalc.calculator;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/** Saakshi, disguised as a calculator: the live web app, plus the service that keeps an SOS recording. */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WitnessPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
