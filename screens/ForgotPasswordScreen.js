import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
  ScrollView, Dimensions, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, TouchableWithoutFeedback, Keyboard,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { forgotPasswordAPI } from '../services/api';
import FloatingInput from '../components/FloatingInput';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, isDark } = useTheme();

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [entered, setEntered] = useState(false);

  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardElev    = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(iconScale,   { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardY,       { toValue: 0, duration: 600, delay: 100, useNativeDriver: isIOS }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 550, delay: 100, useNativeDriver: isIOS }),
        Animated.timing(cardElev,    { toValue: 1, duration: 550, delay: 100, useNativeDriver: false }),
      ]).start(() => setEntered(true));
    });
    return () => task.cancel();
  }, []);

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: isIOS }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: isIOS }),
      Animated.timing(shakeX, { toValue: 7,   duration: 55, useNativeDriver: isIOS }),
      Animated.timing(shakeX, { toValue: -7,  duration: 55, useNativeDriver: isIOS }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: isIOS }),
    ]).start();
  };

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    if (Object.keys(e).length) shakeCard();
    return !Object.keys(e).length;
  };

  const handleSend = async () => {
    if (!validate()) return;
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(async () => {
      setLoading(true);
      try {
        const res = await forgotPasswordAPI(email.trim());
        Alert.alert('OTP Sent', res.message || 'A reset code has been sent to your email.', [
          { text: 'Continue', onPress: () => navigation.navigate('OtpVerification', { email: email.trim() }) },
        ]);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  };

  const cardShadow = isIOS ? null : { elevation: cardElev.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) };
  const btnShadow  = isIOS ? null : { elevation: cardElev.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) };
  const iconShadow = isIOS ? null : { elevation: 0 };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Background SVG Waves */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={320} viewBox={`0 0 ${width} 320`} style={{ position: 'absolute', top: 0 }}>
          <Defs>
            <LinearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={isDark ? "0.30" : "0.22"} />
              <Stop offset="100%" stopColor="#48CAE4" stopOpacity={isDark ? "0.18" : "0.12"} />
            </LinearGradient>
            <LinearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={isDark ? "0.18" : "0.12"} />
              <Stop offset="100%" stopColor="#48CAE4" stopOpacity={isDark ? "0.10" : "0.06"} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M0,0 L${width},0 L${width},180 Q${width * 0.75},240 ${width * 0.5},200 Q${width * 0.25},160 0,220 Z`}
            fill="url(#waveGrad1)"
          />
          <Path
            d={`M0,0 L${width},0 L${width},140 Q${width * 0.75},200 ${width * 0.5},165 Q${width * 0.25},130 0,180 Z`}
            fill="url(#waveGrad2)"
          />
        </Svg>
        <Svg width={width} height={200} viewBox={`0 0 ${width} 200`} style={{ position: 'absolute', bottom: 0 }}>
          <Defs>
            <LinearGradient id="waveGrad3" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0%" stopColor="#48CAE4" stopOpacity={isDark ? "0.15" : "0.10"} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={isDark ? "0.10" : "0.06"} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M0,200 L${width},200 L${width},80 Q${width * 0.75},20 ${width * 0.5},60 Q${width * 0.25},100 0,40 Z`}
            fill="url(#waveGrad3)"
          />
        </Svg>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Icon */}
            <Animated.View
              style={[s.iconSection, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}
              renderToHardwareTextureAndroid={!entered}
            >
              <View style={[s.iconRing, { backgroundColor: `${colors.primary}25` }]}>
                <Animated.View style={[s.iconCircle, iconShadow, { backgroundColor: colors.primary }]}>
                  <Ionicons name="mail-unread-outline" size={34} color="#FFFFFF" />
                </Animated.View>
              </View>
              <Text style={[s.screenTitle, { color: colors.text }]}>Forgot Password?</Text>
              <Text style={[s.screenSub, { color: colors.textSecondary }]}>No worries, we'll send you a reset code</Text>
            </Animated.View>

            {/* Card */}
            <Animated.View
              style={[s.card, cardShadow, {
                backgroundColor: colors.surface,
                shadowColor: colors.shadow,
                opacity: cardOpacity,
                transform: [{ translateY: cardY }, { translateX: shakeX }],
              }]}
              renderToHardwareTextureAndroid={!entered}
            >
              <Text style={[s.cardTitle, { color: colors.text }]}>Enter your email</Text>
              <Text style={[s.cardSub, { color: colors.textTertiary }]}>We'll send a 6-digit OTP to verify your identity</Text>

              <View style={{ marginTop: 22 }}>
                <FloatingInput
                  label="Email Address"
                  icon="mail-outline"
                  value={email}
                  keyboardType="email-address"
                  onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: null })); }}
                  error={errors.email}
                  editable={!loading}
                />
              </View>

              {/* Send OTP Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 10 }}>
                <AnimatedTouchable
                  style={[s.btn, btnShadow, { backgroundColor: colors.primary }, loading && s.btnOff]}
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Send OTP</Text>
                      <View style={s.btnArrow}>
                        <Ionicons name="send-outline" size={15} color={colors.primary} />
                      </View>
                    </View>
                  )}
                </AnimatedTouchable>
              </Animated.View>

              {/* Back to Login */}
              <TouchableOpacity style={s.loginRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back-outline" size={15} color={colors.primary} />
                <Text style={[s.loginText, { color: colors.primary }]}> Back to Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: height * 0.06,
    paddingBottom: 40,
    minHeight: height - 80,
  },

  iconSection: { alignItems: 'center', marginBottom: 28, marginTop: 20 },
  iconRing: {
    width: 92, height: 92, borderRadius: 46,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  screenSub: { fontSize: 13.5, textAlign: 'center' },

  card: {
    borderRadius: 26, padding: 26,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13, shadowRadius: 28, elevation: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13 },

  btn: {
    borderRadius: 14, height: 56,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 8, marginBottom: 20,
  },
  btnOff: { backgroundColor: '#C4C4C4', shadowColor: 'transparent', elevation: 0 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  btnArrow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, fontWeight: '600' },
});
