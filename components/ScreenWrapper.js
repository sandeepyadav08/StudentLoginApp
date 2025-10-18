import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';

const ScreenWrapper = ({ children, style, useSafeArea = true }) => {
  const { colors, isDark } = useTheme();

  const Container = useSafeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }, style]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenWrapper;