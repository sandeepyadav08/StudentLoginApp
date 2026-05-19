import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  InteractionManager,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginAPI } from '../services/api';
import FloatingInput from '../components/FloatingInput';

const { width, height } = Dimensions.get('window');

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [rememberMe, setRememberMe]   = useState(false);

  // Animations
  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSaved();
    const task = InteractionManager.runAfterInteractions(() => {
      runEntrance();
    });
    return () => task.cancel();
  }, []);

  const runEntrance = () => {
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(cardY,       { toValue: 0, duration: 650, delay: 150, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  };

const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 7,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const pressBtn = (cb) => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(() => cb && cb());
  };

  const loadSaved = async () => {
    try {
      const saved = await AsyncStorage.getItem('rememberedEmail');
      if (saved) { setEmail(saved); setRememberMe(true); }
    } catch {}
  };

  const toggleRemember = async () => {
    const next = !rememberMe;
    setRememberMe(next);
    if (!next) try { await AsyncStorage.removeItem('rememberedEmail'); } catch {}
  };

  const validate = () => {
    const e = {};
    if (!email.trim())                              e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password.trim())                           e.password = 'Password is required';
    else if (password.length < 6)                  e.password = 'Minimum 6 characters';
    setErrors(e);
    if (Object.keys(e).length) shakeCard();
    return !Object.keys(e).length;
  };

  const handleLogin = () => {
    if (!validate()) return;
    pressBtn(async () => {
      setLoading(true);
      try {
        const res = await loginAPI(email.trim(), password);
        if (!res.success) {
          Alert.alert('Login Failed', res.message, [{ text: 'OK', onPress: () => setLoading(false) }]);
          return;
        }
        await AsyncStorage.setItem('userToken', res.token);
        await AsyncStorage.setItem('userEmail', email.trim());
        if (res.user) await AsyncStorage.setItem('userData', JSON.stringify(res.user));
        if (rememberMe) await AsyncStorage.setItem('rememberedEmail', email.trim());
        else await AsyncStorage.removeItem('rememberedEmail');
        navigation.replace('Dashboard');
      } catch {
        Alert.alert('Error', 'Something went wrong. Please try again.', [
          { text: 'OK', onPress: () => setLoading(false) },
        ]);
      }
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      {/* ── Background SVG Waves ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top wave */}
        <Svg width={width} height={320} viewBox={`0 0 ${width} 320`} style={{ position: 'absolute', top: 0 }}>
          <Defs>
            <LinearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#6C63FF" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#48CAE4" stopOpacity="0.12" />
            </LinearGradient>
            <LinearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#6C63FF" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#48CAE4" stopOpacity="0.06" />
            </LinearGradient>
          </Defs>
          {/* Wave layer 1 */}
          <Path
            d={`M0,0 L${width},0 L${width},180 Q${width * 0.75},240 ${width * 0.5},200 Q${width * 0.25},160 0,220 Z`}
            fill="url(#waveGrad1)"
          />
          {/* Wave layer 2 */}
          <Path
            d={`M0,0 L${width},0 L${width},140 Q${width * 0.75},200 ${width * 0.5},165 Q${width * 0.25},130 0,180 Z`}
            fill="url(#waveGrad2)"
          />
        </Svg>

        {/* Bottom wave */}
        <Svg width={width} height={200} viewBox={`0 0 ${width} 200`} style={{ position: 'absolute', bottom: 0 }}>
          <Defs>
            <LinearGradient id="waveGrad3" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0%" stopColor="#48CAE4" stopOpacity="0.10" />
              <Stop offset="100%" stopColor="#6C63FF" stopOpacity="0.06" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M0,200 L${width},200 L${width},80 Q${width * 0.75},20 ${width * 0.5},60 Q${width * 0.25},100 0,40 Z`}
            fill="url(#waveGrad3)"
          />
        </Svg>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Brand / Logo ── */}
            <Animated.View style={[s.brand, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              <View style={s.logoRing}>
                <View style={s.logoCircle}>
                  <Image
                    source={require('../assets/iimt_logo_icon.png')}
                    style={s.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={s.appName}>IIMT Portal</Text>
              <Text style={s.tagline}>Your academic journey starts here</Text>
            </Animated.View>

            {/* ── Card ── */}
            <Animated.View
              style={[s.card, {
                opacity: cardOpacity,
                transform: [{ translateY: cardY }, { translateX: shakeX }],
              }]}
            >
              {/* Card Header */}
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Welcome Back</Text>
                <Text style={s.cardSub}>Sign in to continue</Text>
              </View>

              {/* Inputs */}
              <View style={{ marginTop: 20 }}>
                <FloatingInput
                  label="Email Address"
                  icon="mail-outline"
                  value={email}
                  keyboardType="email-address"
                  onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: null })); }}
                  error={errors.email}
                  editable={!loading}
                />
                <FloatingInput
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  secureTextEntry={!showPass}
                  onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
                  error={errors.password}
                  editable={!loading}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPass(v => !v)} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#A0AEC0" />
                    </TouchableOpacity>
                  }
                />
              </View>

              {/* Remember + Forgot */}
              <View style={s.optRow}>
                <TouchableOpacity style={s.remRow} onPress={toggleRemember} activeOpacity={0.7}>
                  <View style={[s.checkbox, rememberMe && s.checkOn]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <Text style={s.remText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
                  <Text style={s.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={[s.btn, loading && s.btnOff]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Sign In</Text>
                      <View style={s.btnArrow}>
                        <Ionicons name="arrow-forward" size={16} color="#6C63FF" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },


  // Scroll
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: height * 0.06,
    paddingBottom: 40,
    minHeight: height - 80,
  },

  // Brand
  brand: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  tagline: { fontSize: 13.5, color: '#718096', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 26,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 12,
  },
  cardHeader: { marginBottom: 4 },
  cardTitle: { fontSize: 21, fontWeight: '700', color: '#1A1A2E', marginBottom: 3 },
  cardSub: { fontSize: 14, color: '#A0AEC0', fontWeight: '400' },

  // Options row
  optRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  remRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOn: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  remText: { fontSize: 13, color: '#4A5568', fontWeight: '500' },
  forgotText: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },

  // Button
  btn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  btnOff: { backgroundColor: '#C4C4C4', shadowColor: 'transparent', elevation: 0 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  btnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

});
