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
import { forgotPasswordAPI } from '../services/api';
import FloatingInput from '../components/FloatingInput';

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;
  const orb1Y       = useRef(new Animated.Value(0)).current;
  const orb2Y       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wait for navigation transition to finish before starting animations (Android fix)
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(iconScale,   { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardY,       { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 550, delay: 100, useNativeDriver: true }),
      ]).start();

      const loop = (anim, dur, delay = 0) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: dur, delay, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: dur, useNativeDriver: true }),
          ])
        ).start();
      loop(orb1Y, 4000);
      loop(orb2Y, 3500, 900);
    });

    return () => task.cancel();
  }, []);

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 7,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
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

  const orb1T = orb1Y.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const orb2T = orb2Y.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      {/* Background Orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[s.orb1, { transform: [{ translateY: orb1T }] }]} />
        <Animated.View style={[s.orb2, { transform: [{ translateY: orb2T }] }]} />
        <View style={s.orb3} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Icon */}
            <Animated.View style={[s.iconSection, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
              <View style={s.iconRing}>
                <View style={s.iconCircle}>
                  <Ionicons name="mail-unread-outline" size={34} color="#FFFFFF" />
                </View>
              </View>
              <Text style={s.screenTitle}>Forgot Password?</Text>
              <Text style={s.screenSub}>No worries, we'll send you a reset code</Text>
            </Animated.View>

            {/* Card */}
            <Animated.View
              style={[s.card, {
                opacity: cardOpacity,
                transform: [{ translateY: cardY }, { translateX: shakeX }],
              }]}
            >
              <Text style={s.cardTitle}>Enter your email</Text>
              <Text style={s.cardSub}>We'll send a 6-digit OTP to verify your identity</Text>

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
                <TouchableOpacity
                  style={[s.btn, loading && s.btnOff]}
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
                        <Ionicons name="send-outline" size={15} color="#6C63FF" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Back to Login */}
              <TouchableOpacity style={s.loginRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back-outline" size={15} color="#6C63FF" />
                <Text style={s.loginText}> Back to Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0EEFF' },

  orb1: {
    position: 'absolute', width: width * 0.75, height: width * 0.75,
    borderRadius: width * 0.375, backgroundColor: 'rgba(108, 99, 255, 0.13)',
    top: -width * 0.22, left: -width * 0.18,
  },
  orb2: {
    position: 'absolute', width: width * 0.55, height: width * 0.55,
    borderRadius: width * 0.275, backgroundColor: 'rgba(59, 130, 246, 0.1)',
    bottom: height * 0.08, right: -width * 0.12,
  },
  orb3: {
    position: 'absolute', width: width * 0.32, height: width * 0.32,
    borderRadius: width * 0.16, backgroundColor: 'rgba(236, 72, 153, 0.07)',
    top: height * 0.38, right: -width * 0.06,
  },

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
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', letterSpacing: 0.3, marginBottom: 4 },
  screenSub: { fontSize: 13.5, color: '#718096', textAlign: 'center' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 26, padding: 26,
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13, shadowRadius: 28, elevation: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#A0AEC0' },

  btn: {
    backgroundColor: '#6C63FF', borderRadius: 14, height: 56,
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
  loginText: { fontSize: 14, color: '#6C63FF', fontWeight: '600' },
});
