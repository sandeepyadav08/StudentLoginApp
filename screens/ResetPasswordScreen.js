import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { resetPasswordAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function ResetPasswordScreen({ navigation, route }) {
  const { email, otpToken, otpVerified } = route.params || {};
  
  // Security check - ensure user came from OTP verification
  React.useEffect(() => {
    if (!email || !otpToken || !otpVerified) {
      Alert.alert(
        'Access Denied',
        'Please verify your OTP first to reset password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ForgotPassword')
          }
        ]
      );
    }
  }, [email, otpToken, otpVerified, navigation]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Password validation
  const validatePassword = (password) => {
    return password.length >= 8;
  };

  // Password strength validation
  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 'none', color: '#d1d5db' };
    if (password.length < 6) return { strength: 'weak', color: '#ef4444' };
    if (password.length < 8) return { strength: 'medium', color: '#f59e0b' };
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score >= 3 && password.length >= 8) return { strength: 'strong', color: '#10b981' };
    return { strength: 'medium', color: '#f59e0b' };
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle password reset
  const handleResetPassword = async () => {
    // Security check before proceeding
    if (!email || !otpToken || !otpVerified) {
      Alert.alert(
        'Error',
        'Invalid session. Please start over.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ForgotPassword')
          }
        ]
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Import the resetPasswordAPI - uses combined OTP verification and password update
      const { resetPasswordAPI } = require('../services/api');
      const response = await resetPasswordAPI(email, otpToken, newPassword);
      
      // If we reach here, password reset was successful
      Alert.alert(
        'Password Reset Successful', 
        response.message || 'Your password has been reset successfully! You can now login with your new password.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      // Show only a user-friendly alert, avoid noisy console errors in production
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear error when user starts typing
  const handleNewPasswordChange = (text) => {
    setNewPassword(text);
    if (errors.newPassword) {
      setErrors({ ...errors, newPassword: null });
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors({ ...errors, confirmPassword: null });
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Reset Password Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Reset Password</Text>
            
            <Text style={styles.description}>
              Create a new password for{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  value={newPassword}
                  onChangeText={handleNewPasswordChange}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={22} 
                    color="#a855f7" 
                  />
                </TouchableOpacity>
              </View>
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
              
              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View 
                      style={[
                        styles.strengthFill, 
                        { 
                          backgroundColor: passwordStrength.color,
                          width: passwordStrength.strength === 'weak' ? '33%' : 
                                passwordStrength.strength === 'medium' ? '66%' : '100%'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.strength === 'weak' && 'Weak'}
                    {passwordStrength.strength === 'medium' && 'Medium'}
                    {passwordStrength.strength === 'strong' && 'Strong'}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={22} 
                    color="#a855f7" 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <Text style={styles.requirementText}>• At least 8 characters</Text>
              <Text style={styles.requirementText}>• Mix of uppercase & lowercase letters</Text>
              <Text style={styles.requirementText}>• At least one number</Text>
              <Text style={styles.requirementText}>• At least one special character</Text>
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity
              style={[styles.resetButton, loading && styles.resetButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.resetButtonText}>Resetting...</Text>
              ) : (
                <Text style={styles.resetButtonText}>RESET PASSWORD</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity 
              style={styles.backToLoginContainer}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3e8ff', // Light purple background
  },
  container: {
    flex: 1,
    backgroundColor: '#f3e8ff', // Light purple background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 30,
    minHeight: height - 100,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c3aed',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  emailText: {
    fontWeight: '600',
    color: '#374151',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    height: 54,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  resetButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7c3aed',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowColor: 'transparent',
    elevation: 0,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1,
  },
  backToLoginContainer: {
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});
