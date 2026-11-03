package com.velocitytouch.motionlab;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register custom native Meta ads plugin after the bridge initializes
        registerPlugin(MetaAdsPlugin.class);
    }
}