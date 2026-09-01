package com.zazan.ai;

import com.getcapacitor.BridgeActivity;
import com.zazan.ai.plugins.VoiceActionsPlugin;
import com.zazan.ai.plugins.VoiceAssistantPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(VoiceActionsPlugin.class);
        registerPlugin(VoiceAssistantPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
