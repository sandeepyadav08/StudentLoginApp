import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const ScreenWrapper = ({ children, style, useSafeArea = true }) => {
  const { colors, isDark } = useTheme();
  const Container = useSafeArea ? SafeAreaView : View;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {!isDark && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={SCREEN_W} height={SCREEN_H} viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}>
            <Defs>
              <LinearGradient id="wg1" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#6C63FF" stopOpacity="0.22" />
                <Stop offset="100%" stopColor="#48CAE4" stopOpacity="0.12" />
              </LinearGradient>
              <LinearGradient id="wg2" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#6C63FF" stopOpacity="0.12" />
                <Stop offset="100%" stopColor="#48CAE4" stopOpacity="0.06" />
              </LinearGradient>
            </Defs>
            <Path d={`M0,0 L${SCREEN_W},0 L${SCREEN_W},${SCREEN_H*0.28} Q${SCREEN_W*0.75},${SCREEN_H*0.36} ${SCREEN_W*0.5},${SCREEN_H*0.30} Q${SCREEN_W*0.25},${SCREEN_H*0.24} 0,${SCREEN_H*0.33} Z`} fill="url(#wg1)" />
            <Path d={`M0,0 L${SCREEN_W},0 L${SCREEN_W},${SCREEN_H*0.22} Q${SCREEN_W*0.75},${SCREEN_H*0.30} ${SCREEN_W*0.5},${SCREEN_H*0.25} Q${SCREEN_W*0.25},${SCREEN_H*0.20} 0,${SCREEN_H*0.27} Z`} fill="url(#wg2)" />
          </Svg>
        </View>
      )}
      <Container style={[styles.container, style]}>
        {children}
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
});

export default ScreenWrapper;
