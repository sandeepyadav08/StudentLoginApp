import { useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

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

export default function WebViewScreen({ navigation, route }) {
  const { width: screenWidth } = Dimensions.get("window");
  const { colors, isDark } = useTheme();
  const { url, title } = route.params;
  const webViewRef = useRef(null);

  const LoadingIndicator = () => (
    <View
      style={[styles.loadingContainer, { backgroundColor: colors.background }]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading {title}...
      </Text>
    </View>
  );

  const ErrorComponent = ({ onRetry }) => (
    <View
      style={[styles.errorContainer, { backgroundColor: colors.background }]}
    >
      <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        Failed to load page
      </Text>
      <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
        Please check your internet connection and try again.
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              paddingHorizontal: getResponsivePadding(16, screenWidth),
              paddingVertical: getResponsivePadding(15, screenWidth),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.primary,
                fontSize: getResponsiveSize(18, screenWidth),
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          <WebView
            source={{ uri: url }}
            style={[styles.webView, { backgroundColor: colors.background }]}
            startInLoadingState={true}
            renderLoading={() => <LoadingIndicator />}
            renderError={() => (
              <ErrorComponent
                onRetry={() => {
                  // Force WebView to reload
                  webViewRef.current?.reload();
                }}
              />
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView error: ", nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView HTTP error: ", nativeEvent);
            }}
            ref={webViewRef}
            allowsBackForwardNavigationGestures={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={true}
            scalesPageToFit={true}
            mixedContentMode={"compatibility"}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
          />
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    marginTop: Platform.OS === "android" ? 0 : 0,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerRight: {
    width: 40, // Match backButton width for centering
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
