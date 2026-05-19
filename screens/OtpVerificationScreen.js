import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert,
  ScrollView, Dimensions, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, TouchableWithoutFeedback, Keyboard,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { verifyOtpAPI, forgotPasswordAPI } from '../services/api';
import FloatingInput from '../components/FloatingInput';

const { width, height } = Dimensions.get('window');

// ─── Single OTP Box ───────────────────────────────────────────────────────────
function OtpBox({ value, onChangeText, onKeyPress, inputRef, error, editable }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 70, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 70, useNativeDriver: true }),
      ]).start();
    }
  }, [value]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TextInput
        ref={inputRef}
        style={[ob.box, value && ob.filled, error && ob.errBox]}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        keyboardType="numeric"
        maxLength={1}
        textAlign="center"
        selectTextOnFocus
        editable={editable}
      />
    </Animated.View>
  );
}

const ob = StyleSheet.create({
  box: {
    width: (width - 44 - 22 * 2 - 5 * 10) / 6,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    textAlign: 'center',
  },
  filled: { borderColor: '#6C63FF', backgroundColor: '#F0EEFF' },
  errBox: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OtpVerificationScreen({ navigation, route }) {
  const { email } = route.params || {};

  const [otp, setOtp]                       = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState({});
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown]           = useState(30);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Animations
  const iconScale   = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(iconScale,   { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(cardY,       { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 550, delay: 100, useNativeDriver: true }),
      ]).start();
    });
    return () => task.cancel();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && resendDisabled) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (countdown === 0) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 7,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (errors.otp) setErrors(e => ({ ...e, otp: null }));
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleKeyPress = (key, idx) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const validate = () => {
    const e = {};
    if (otp.join('').length !== 6) e.otp = 'Please enter the complete 6-digit OTP';
    if (!newPassword.trim()) e.newPassword = 'New password is required';
    else if (newPassword.length < 8) e.newPassword = 'Minimum 8 characters required';
    if (!confirmPassword.trim()) e.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) shakeCard();
    return !Object.keys(e).length;
  };

  const handleVerify = () => {
    if (!validate()) return;
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(async () => {
      setLoading(true);
      try {
        const res = await verifyOtpAPI(email, otp.join(''), newPassword);
        Alert.alert('Password Reset Successful', res.message || 'Your password has been reset. You can now sign in.', [
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]);
      } catch (err) {
        Alert.alert('Error', err.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        otpRefs[0].current?.focus();
      } finally {
        setLoading(false);
      }
    });
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setCountdown(30);
    try {
      const res = await forgotPasswordAPI(email);
      Alert.alert('OTP Sent', res.message || 'A new OTP has been sent to your email.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend OTP.');
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      {/* Background SVG Waves */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
            {/* Back Button */}
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <View style={s.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#6C63FF" />
              </View>
            </TouchableOpacity>

            {/* Icon */}
            <Animated.View style={[s.iconSection, { transform: [{ scale: iconScale }] }]}>
              <View style={s.iconRing}>
                <View style={s.iconCircle}>
                  <Ionicons name="shield-checkmark-outline" size={34} color="#FFFFFF" />
                </View>
              </View>
              <Text style={s.screenTitle}>Verify OTP</Text>
              <Text style={s.screenSub}>Code sent to</Text>
              <Text style={s.emailHighlight}>{email}</Text>
            </Animated.View>

            {/* Card */}
            <Animated.View
              style={[s.card, {
                opacity: cardOpacity,
                transform: [{ translateY: cardY }, { translateX: shakeX }],
              }]}
            >
              {/* OTP Boxes */}
              <Text style={s.sectionLabel}>Enter 6-digit OTP</Text>
              <View style={s.otpRow}>
                {otp.map((digit, idx) => (
                  <OtpBox
                    key={idx}
                    value={digit}
                    inputRef={otpRefs[idx]}
                    onChangeText={(v) => handleOtpChange(v, idx)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                    error={!!errors.otp}
                    editable={!loading}
                  />
                ))}
              </View>
              {errors.otp && <Text style={s.errText}>{errors.otp}</Text>}

              {/* Resend */}
              <View style={s.resendRow}>
                <Text style={s.resendInfo}>Didn't receive code? </Text>
                <TouchableOpacity onPress={handleResend} disabled={resendDisabled} activeOpacity={0.7}>
                  <Text style={[s.resendLink, resendDisabled && s.resendOff]}>
                    {resendDisabled ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divLabel}>NEW PASSWORD</Text>
                <View style={s.divLine} />
              </View>

              {/* New Password */}
              <FloatingInput
                label="New Password"
                icon="lock-closed-outline"
                value={newPassword}
                secureTextEntry={!showNew}
                onChangeText={(t) => { setNewPassword(t); setErrors(e => ({ ...e, newPassword: null })); }}
                error={errors.newPassword}
                editable={!loading}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowNew(v => !v)} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={20} color="#A0AEC0" />
                  </TouchableOpacity>
                }
              />

              {/* Confirm Password */}
              <FloatingInput
                label="Confirm Password"
                icon="lock-open-outline"
                value={confirmPassword}
                secureTextEntry={!showConfirm}
                onChangeText={(t) => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: null })); }}
                error={errors.confirmPassword}
                editable={!loading}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color="#A0AEC0" />
                  </TouchableOpacity>
                }
              />

              {/* Reset Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
                <TouchableOpacity
                  style={[s.btn, loading && s.btnOff]}
                  onPress={handleVerify}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Reset Password</Text>
                      <View style={s.btnArrow}>
                        <Ionicons name="checkmark" size={16} color="#6C63FF" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Back to Login */}
              <TouchableOpacity style={s.loginRow} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  scroll: {
    flexGrow: 1, paddingHorizontal: 22, paddingVertical: 28, minHeight: height - 80,
  },

  backBtn: { marginBottom: 8 },
  backCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  iconSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  iconRing: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  screenSub: { fontSize: 13.5, color: '#718096' },
  emailHighlight: { fontSize: 14, fontWeight: '700', color: '#6C63FF', marginTop: 2 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 26, padding: 24,
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13, shadowRadius: 28, elevation: 12,
  },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 14 },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },

  errText: { fontSize: 12, color: '#EF4444', textAlign: 'center', marginBottom: 10 },

  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  resendInfo: { fontSize: 13, color: '#718096' },
  resendLink: { fontSize: 13, color: '#6C63FF', fontWeight: '700' },
  resendOff: { color: '#A0AEC0' },

  divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  divLine: { flex: 1, height: 1, backgroundColor: '#EDF2F7' },
  divLabel: { fontSize: 10, color: '#CBD5E0', marginHorizontal: 10, letterSpacing: 1.2, fontWeight: '600' },

  btn: {
    backgroundColor: '#6C63FF', borderRadius: 14, height: 56,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 8, marginBottom: 18,
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
