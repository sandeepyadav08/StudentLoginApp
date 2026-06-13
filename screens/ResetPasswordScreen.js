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
import FloatingInput from '../components/FloatingInput';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const getStrength = (pw) => {
  if (!pw)             return { label: '',       color: '#E2E8F0', pct: '0%'  };
  if (pw.length < 6)   return { label: 'Weak',   color: '#EF4444', pct: '33%' };
  if (pw.length < 8)   return { label: 'Medium', color: '#F59E0B', pct: '66%' };
  const strong = [/[A-Z]/, /[a-z]/, /\d/, /[!@#$%^&*]/.test(pw)].filter(r => typeof r === 'boolean' ? r : r.test(pw)).length >= 3;
  return strong
    ? { label: 'Strong', color: '#10B981', pct: '100%' }
    : { label: 'Medium', color: '#F59E0B', pct: '66%'  };
};

export default function ResetPasswordScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { email, otpToken, otpVerified } = route.params || {};

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [errors, setErrors]                   = useState({});
  const [entered, setEntered]                 = useState(false);

  const iconScale   = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardElev    = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;
  const orb1Y       = useRef(new Animated.Value(0)).current;
  const orb2Y       = useRef(new Animated.Value(0)).current;
  const strengthW   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!email || !otpToken || !otpVerified) {
      Alert.alert('Access Denied', 'Please verify your OTP first.', [
        { text: 'OK', onPress: () => navigation.navigate('ForgotPassword') },
      ]);
    }

    const task = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(iconScale,   { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(cardY,       { toValue: 0, duration: 600, delay: 100, useNativeDriver: isIOS }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 550, delay: 100, useNativeDriver: isIOS }),
        Animated.timing(cardElev,    { toValue: 1, duration: 550, delay: 100, useNativeDriver: false }),
      ]).start(() => setEntered(true));

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

  useEffect(() => {
    const str = getStrength(newPassword);
    const target = parseFloat(str.pct) / 100;
    Animated.timing(strengthW, { toValue: target, duration: 300, useNativeDriver: false }).start();
  }, [newPassword]);

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
    if (!newPassword.trim()) e.newPassword = 'Password is required';
    else if (newPassword.length < 8) e.newPassword = 'Minimum 8 characters required';
    if (!confirmPassword.trim()) e.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) shakeCard();
    return !Object.keys(e).length;
  };

  const handleReset = () => {
    if (!email || !otpToken || !otpVerified) {
      Alert.alert('Error', 'Invalid session. Please start over.', [
        { text: 'OK', onPress: () => navigation.navigate('ForgotPassword') },
      ]);
      return;
    }
    if (!validate()) return;

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(async () => {
      setLoading(true);
      try {
        const { resetPasswordAPI } = require('../services/api');
        const res = await resetPasswordAPI(email, otpToken, newPassword);
        Alert.alert('Password Reset!', res.message || 'Your password has been reset successfully.', [
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to reset password. Please try again.');
      } finally {
        setLoading(false);
      }
    });
  };

  const strength  = getStrength(newPassword);
  const orb1T     = orb1Y.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const orb2T     = orb2Y.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const barWidth  = strengthW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const cardShadow = isIOS ? null : { elevation: cardElev.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) };
  const btnShadow  = isIOS ? null : { elevation: cardElev.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) };
  const iconShadow = isIOS ? null : { elevation: 0 };

  const orbColor1 = isDark ? 'rgba(139, 131, 255, 0.18)' : 'rgba(108, 99, 255, 0.13)';
  const orbColor2 = isDark ? 'rgba(59, 130, 246, 0.14)'  : 'rgba(59, 130, 246, 0.1)';
  const orbColor3 = isDark ? 'rgba(236, 72, 153, 0.10)'  : 'rgba(236, 72, 153, 0.07)';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Background Orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[s.orb1, { backgroundColor: orbColor1, transform: [{ translateY: orb1T }] }]} />
        <Animated.View style={[s.orb2, { backgroundColor: orbColor2, transform: [{ translateY: orb2T }] }]} />
        <View style={[s.orb3, { backgroundColor: orbColor3 }]} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back Button */}
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <View style={[s.backCircle, { backgroundColor: colors.surface, shadowColor: colors.primary }]}>
                <Ionicons name="arrow-back" size={20} color={colors.primary} />
              </View>
            </TouchableOpacity>

            {/* Icon */}
            <Animated.View
              style={[s.iconSection, { transform: [{ scale: iconScale }] }]}
              renderToHardwareTextureAndroid={!entered}
            >
              <View style={[s.iconRing, { backgroundColor: `${colors.primary}25` }]}>
                <Animated.View style={[s.iconCircle, iconShadow, { backgroundColor: colors.primary }]}>
                  <Ionicons name="key-outline" size={34} color="#FFFFFF" />
                </Animated.View>
              </View>
              <Text style={[s.screenTitle, { color: colors.text }]}>Reset Password</Text>
              <Text style={[s.screenSub, { color: colors.textSecondary }]}>Create a strong new password for</Text>
              <Text style={[s.emailHighlight, { color: colors.primary }]}>{email}</Text>
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
              <Text style={[s.cardTitle, { color: colors.text }]}>New Password</Text>
              <Text style={[s.cardSub, { color: colors.textTertiary }]}>Must be at least 8 characters</Text>

              <View style={{ marginTop: 20 }}>
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
                      <Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  }
                />

                {/* Strength Bar */}
                {newPassword.length > 0 && (
                  <View style={s.strengthWrap}>
                    <View style={[s.strengthTrack, { backgroundColor: colors.borderLight }]}>
                      <Animated.View style={[s.strengthFill, { width: barWidth, backgroundColor: strength.color }]} />
                    </View>
                    <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                  </View>
                )}

                <View style={{ marginTop: 6 }}>
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
                        <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    }
                  />
                </View>
              </View>

              {/* Password Rules */}
              <View style={[s.rulesBox, { backgroundColor: colors.surfaceVariant }]}>
                {[
                  ['At least 8 characters',              newPassword.length >= 8],
                  ['Uppercase & lowercase letters',       /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)],
                  ['At least one number',                 /\d/.test(newPassword)],
                ].map(([rule, met]) => (
                  <View key={rule} style={s.ruleRow}>
                    <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? '#10B981' : colors.textTertiary} />
                    <Text style={[s.ruleText, { color: colors.textTertiary }, met && { color: colors.text }]}>{rule}</Text>
                  </View>
                ))}
              </View>

              {/* Reset Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <AnimatedTouchable
                  style={[s.btn, btnShadow, { backgroundColor: colors.primary }, loading && s.btnOff]}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Reset Password</Text>
                      <View style={s.btnArrow}>
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      </View>
                    </View>
                  )}
                </AnimatedTouchable>
              </Animated.View>

              {/* Back to Login */}
              <TouchableOpacity style={s.loginRow} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
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

  orb1: {
    position: 'absolute', width: width * 0.75, height: width * 0.75,
    borderRadius: width * 0.375,
    top: -width * 0.22, left: -width * 0.18,
  },
  orb2: {
    position: 'absolute', width: width * 0.55, height: width * 0.55,
    borderRadius: width * 0.275,
    bottom: height * 0.08, right: -width * 0.12,
  },
  orb3: {
    position: 'absolute', width: width * 0.32, height: width * 0.32,
    borderRadius: width * 0.16,
    top: height * 0.38, right: -width * 0.06,
  },

  scroll: {
    flexGrow: 1, paddingHorizontal: 22, paddingVertical: 28, minHeight: height - 80,
  },

  backBtn: { marginBottom: 8 },
  backCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  iconSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  iconRing: {
    width: 92, height: 92, borderRadius: 46,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  screenSub: { fontSize: 13.5 },
  emailHighlight: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  card: {
    borderRadius: 26, padding: 24,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13, shadowRadius: 28, elevation: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 3 },
  cardSub: { fontSize: 13 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 6, gap: 10 },
  strengthTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 46 },

  rulesBox: {
    borderRadius: 12, padding: 14,
    marginBottom: 20, marginTop: 4, gap: 8,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 13, fontWeight: '500' },

  btn: {
    borderRadius: 14, height: 56,
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
  loginText: { fontSize: 14, fontWeight: '600' },
});
