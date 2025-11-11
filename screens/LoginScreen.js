import React, { useState, useEffect } from 'react';
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
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// Responsive utility functions
const getResponsiveSize = (baseSize, screenWidth) => {
  const scale = screenWidth / 375; // 375 is iPhone 6/7/8 width as base
  return Math.round(baseSize * Math.max(scale, 0.8)); // Minimum scale of 0.8
};

const getResponsivePadding = (basePadding, screenWidth) => {
  if (screenWidth < 350) return basePadding * 0.8;
  if (screenWidth > 414) return basePadding * 1.2;
  return basePadding;
};

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved email on component mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const handleRememberMeToggle = async () => {
    const newRememberMe = !rememberMe;
    setRememberMe(newRememberMe);
    
    // If unchecking remember me, clear saved email
    if (!newRememberMe) {
      try {
        await AsyncStorage.removeItem('rememberedEmail');
      } catch (error) {
        console.error('Error clearing saved email:', error);
      }
    }
  };

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
const handleLogin = async () => {
  if (!validateForm()) {
    return;
  }

  setLoading(true);

  try {
    const response = await loginAPI(email.trim(), password);
    console.log(response);

    if (!response.success) {
      Alert.alert(
        'Error',
        response.message,
        [
          {
            text: 'OK',
            onPress: () => setLoading(false), // ✅ Re-enable login button
          },
        ]
      );
      return;
    }

    // Store token and user data
    await AsyncStorage.setItem('userToken', response.token);
    await AsyncStorage.setItem('userEmail', email.trim());
    if (response.user) {
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    }

    // Save email if remember me is checked
    if (rememberMe) {
      await AsyncStorage.setItem('rememberedEmail', email.trim());
    } else {
      await AsyncStorage.removeItem('rememberedEmail');
    }

    console.log('User logged in:', response.user);
    console.log('Token stored successfully');

    const storedToken = await AsyncStorage.getItem('userToken');
    console.log('Stored token is:', storedToken);

    navigation.replace('Dashboard');
  } catch (error) {
    Alert.alert(
      'Error',
      'Something went wrong. Please try again.',
      [
        { text: 'OK', onPress: () => setLoading(false) } // ✅ Re-enable on error also
      ]
    );
  }
};
  // Clear error when user starts typing
  const handleEmailChange = (text) => {
    setEmail(text);
    if (errors.email) {
      setErrors({ ...errors, email: null });
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) {
      setErrors({ ...errors, password: null });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, {
          paddingHorizontal: getResponsivePadding(16, screenWidth),
          paddingVertical: getResponsivePadding(30, screenWidth)
        }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, {
          marginBottom: getResponsivePadding(40, screenWidth),
          paddingTop: getResponsivePadding(20, screenWidth)
        }]}>
          <Text style={[styles.title, { fontSize: getResponsiveSize(28, screenWidth) }]}>Welcome Back!</Text>
          <Text style={[styles.subtitle, { 
            fontSize: getResponsiveSize(16, screenWidth),
            paddingHorizontal: getResponsivePadding(20, screenWidth)
          }]}>Sign in to continue your journey</Text>
        </View>

        {/* Login Form */}
        <View style={[styles.form, {
          padding: getResponsivePadding(24, screenWidth),
          marginHorizontal: getResponsivePadding(8, screenWidth)
        }]}>
          <Text style={[styles.formTitle, { 
            fontSize: getResponsiveSize(24, screenWidth),
            marginBottom: getResponsivePadding(30, screenWidth)
          }]}>Sign In</Text>
          
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                  size={22} 
                  color="#a855f7" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Remember Me and Forgot Password Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity 
              style={styles.rememberMeContainer}
              onPress={handleRememberMeToggle}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot password</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.loginButtonText}>Logging in...</Text>
            ) : (
              <Text style={styles.loginButtonText}>LOGIN</Text>
            )}
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
    minHeight: height - 100, // Account for status bar and safe area
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7c3aed', // Purple color
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280', // Gray color
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
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
    color: '#7c3aed', // Purple color
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db', // Light gray border
    borderRadius: 12,
    backgroundColor: '#f9fafb', // Very light gray background
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#7c3aed',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#7c3aed', // Purple background
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7c3aed',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowColor: 'transparent',
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
