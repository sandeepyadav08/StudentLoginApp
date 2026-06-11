import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Responsive utility functions
const getResponsiveSize = (baseSize, screenWidth) => {
  const scale = screenWidth / 375;
  return Math.round(baseSize * Math.max(scale, 0.8));
};

const getResponsivePadding = (basePadding, screenWidth) => {
  if (screenWidth < 350) return basePadding * 0.8;
  if (screenWidth > 414) return basePadding * 1.2;
  return basePadding;
};

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  const { colors, themeMode, changeTheme, isDark } = useTheme();

  const handleThemeChange = (newTheme) => {
    changeTheme(newTheme);
  };

  const openWebView = (url, title) => {
    navigation.navigate('WebView', {
      url: url,
      title: title
    });
  };

  const ThemeOption = ({ title, subtitle, value, icon, selected }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: getResponsivePadding(16, screenWidth),
        },
      ]}
      onPress={() => handleThemeChange(value)}
      activeOpacity={0.7}
    >
      <View style={styles.themeOptionLeft}>
        <View style={styles.themeIconContainer}>
          <Ionicons
            name={icon}
            size={screenWidth < 350 ? 20 : 24}
            color={colors.primary}
          />
        </View>
        <View>
          <Text
            style={[
              styles.themeTitle,
              {
                color: colors.text,
                fontSize: getResponsiveSize(16, screenWidth),
              },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.themeSubtitle,
              {
                color: colors.textSecondary,
                fontSize: getResponsiveSize(14, screenWidth),
              },
            ]}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.radioContainer}>
        <View
          style={[
            styles.radioButton,
            {
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : colors.surface,
            },
          ]}
        >
          {selected && (
            <Ionicons
              name="checkmark"
              size={16}
              color={colors.onPrimary}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const AboutItem = ({ title, subtitle, icon, onPress }) => (
    <TouchableOpacity
      style={[
        styles.aboutItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: getResponsivePadding(16, screenWidth),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.aboutItemLeft}>
        <View style={styles.aboutIconContainer}>
          <Ionicons
            name={icon}
            size={screenWidth < 350 ? 20 : 24}
            color={colors.primary}
          />
        </View>
        <View>
          <Text
            style={[
              styles.aboutTitle,
              {
                color: colors.text,
                fontSize: getResponsiveSize(16, screenWidth),
              },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.aboutSubtitle,
                {
                  color: colors.textSecondary,
                  fontSize: getResponsiveSize(14, screenWidth),
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: "transparent",
              paddingHorizontal: getResponsivePadding(16, screenWidth),
              paddingVertical: getResponsivePadding(15, screenWidth),
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primaryContainer || '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: '#6C63FF',
                fontSize: getResponsiveSize(18, screenWidth),
              },
            ]}
          >
            Settings
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollContainer}>
          {/* Theme Section */}
          <View
            style={[
              styles.section,
              {
                marginHorizontal: getResponsivePadding(16, screenWidth),
                marginTop: getResponsivePadding(16, screenWidth),
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: '#6C63FF',
                  fontSize: getResponsiveSize(16, screenWidth),
                  marginBottom: getResponsivePadding(12, screenWidth),
                },
              ]}
            >
              Theme
            </Text>
            
            <View style={styles.sectionContent}>
              <ThemeOption
                title="Automatic"
                subtitle="Follow system theme"
                value="automatic"
                icon="phone-portrait-outline"
                selected={themeMode === 'automatic'}
              />
              
              <ThemeOption
                title="Light"
                subtitle="Always light theme"
                value="light"
                icon="sunny-outline"
                selected={themeMode === 'light'}
              />
              
              <ThemeOption
                title="Dark"
                subtitle="Always dark theme"
                value="dark"
                icon="moon-outline"
                selected={themeMode === 'dark'}
              />
            </View>
          </View>

          {/* About Section */}
          <View
            style={[
              styles.section,
              {
                marginHorizontal: getResponsivePadding(16, screenWidth),
                marginTop: getResponsivePadding(24, screenWidth),
                marginBottom: getResponsivePadding(24, screenWidth),
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: '#6C63FF',
                  fontSize: getResponsiveSize(16, screenWidth),
                  marginBottom: getResponsivePadding(12, screenWidth),
                },
              ]}
            >
              About
            </Text>
            
            <View style={styles.sectionContent}>
              <AboutItem
                title="Version"
                subtitle="1.0.0"
                icon="information-circle-outline"
              />
              
              <AboutItem
                title="Privacy Policy"
                icon="shield-checkmark-outline"
                onPress={() => {
                  openWebView('https://www.iimtrichy.ac.in/en/privacy', 'Privacy Policy');
                }}
              />
              
              <AboutItem
                title="Terms & Conditions"
                icon="document-text-outline"
                onPress={() => {
                  openWebView('https://www.iimtrichy.ac.in/en/tc', 'Terms & Conditions');
                }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  headerRight: {
    width: 40, // Match backButton width for centering
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIconContainer: {
    marginRight: 16,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  themeSubtitle: {
    fontSize: 14,
  },
  radioContainer: {
    marginLeft: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  aboutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aboutIconContainer: {
    marginRight: 16,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  aboutSubtitle: {
    fontSize: 14,
  },
});