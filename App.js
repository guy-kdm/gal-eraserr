import React, { Component } from 'react';
import {
  StyleSheet,
  ScrollView,
  Button,
  View,
  Text,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';

const App: () => React$Node = () => {
  return (
    <>
      <WebView 
        // source={{ uri: 'https://m.facebook.com/dyi/?x=AdmFv3OH-LyagZvO' }} 
        source={{ uri: 'https://m.facebook.com/settings/'}}
        injectedJavaScript={ getInjectedJS() }
        onNavigationStateChange={(result) => console.log(`URL: ${result.url}`)}
        onMessage={({nativeEvent: nativeEvent}) => {
          let parsed = JSON.parse(nativeEvent.data);
          switch (parsed.state) {
            case 'log':
              console.log(parsed.log);
              break;
            case 'error':
              console.error(parsed.error);
              break;
          }          
        }}
      />
    </>
  );
};

function getInjectedJS() {
  return `
    console.log = (msg) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ state: 'log', log: msg }));
    }
    console.error = (msg) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ state: 'error', error: msg }));
    }

    // window.location.href = 'https://m.facebook.com/settings/';
    
    // Settings
    if (window.location.href.contains('.facebook.com/settings/')) {
      let fullAddr = document.querySelector("a[href*='.facebook.com/dyi/']").getAttribute("href");
      if (fullAddr) {
        window.location.href = fullAddr;
      } else {
        console.error("couldn't get info-download url");
      }
    }

    // Download Your Information
    if (window.location.href.contains('.facebook.com/dyi/')) {
      let downloadButton = document.querySelector("button[data-testid*='download'][type='submit']");
      if (downloadButton) {
        downloadButton.click();
      } else {
        console.error("couldn't find the download button");
      }
    }
  `
}

export default App;
