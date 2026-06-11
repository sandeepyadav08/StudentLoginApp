import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const PaymentGatewayScreen = ({ navigation }) => {
  useEffect(() => {
    // Payment data from route params is available but not currently used
    // const paymentData = route.params?.paymentData;

    // Handle hardware back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, []);

  const handleBackPress = () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel the payment?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => navigation.goBack() },
      ]
    );
    return true;
  };

  // Payment history is now handled by backend only

  const handleNavigationStateChange = (navState) => {
    const { url } = navState;

    // Check for payment success/failure URLs
    if (url.includes("payment-success") || url.includes("success")) {
      Alert.alert(
        "Payment Successful",
        "Your payment has been processed successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "PaymentHistory" }],
              });
            },
          },
        ]
      );
    } else if (
      url.includes("payment-failure") ||
      url.includes("failure") ||
      url.includes("cancel")
    ) {
      Alert.alert(
        "Payment Failed",
        "Your payment could not be processed. Please try again.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const generatePaymentHTML = () => {
    // This is the HTML form that will auto-submit to CCAvenue
    // In production, you would get this from your backend API
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Processing Payment...</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .container {
            text-align: center;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #6C63FF;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h3>Redirecting to Payment Gateway...</h3>
          <p>Please wait while we redirect you to CCAvenue.</p>
        </div>
        
        <form method="post" name="server_request" action="https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction">
          <input type="hidden" name="encRequest" value="73ea504af9388b122b91394fc513b79bf58f033f46ba984453d19c99ea1db1a066ab996ba542a075e5a5cc74eb01b19fb5656fd5ca858cfea28420e32643bcaf90c7089f6dd06408c1d6743d93fb33fbe76ac771fe3fc298157e6c0f3234e39b5a588ea874284f7c917e746c5d543f289803f89bdc90fa4d95a32d6537ba2a54438824f0f519644d4013bb9022c67d05259eeadb7a54cf0588fd38c8b328757a5563ba50b1d3a9d24ce366cb06e97e8aa3f1db60ee9a57a8d3c27237e42d1de4584c4b90be78c24c5fdfe658fb418bdfdb71f13b8e6bde2166e793bdcf76be3cc22b2a5559ae7b63b0b2d39347981d27d2a5450e13f0cf29ee31aefa4093370054e2d1bcfdb4f3babcea2a32641eb8b5e6e8b2383d88f9a9e60266981eadb628ccec28e4111273cfb29a5ce77e3f2c92f3dc5c70eb93232cfb3d2908035d9ed7f655cc7c2db44683c2a7a5f585a7cb361a737c0c6887861ba7fc0773990666e79e76ed021c882e378a0da6b933485e74b89ef9eea4b7dca13cf3838d855cd37d12ce06e2f4cd5e50b4873de7390f60686cb4fc440656780f42338d60c3d35af522c595eda33763767333d10001b1ded185c704a8cadd77a6845265405f7d686f47cac02a2e1ce6e13da50c6117161a37a289c222f1339e3a46911c2b48c187dd2e8357934337682438653e3d50226755f203c38bcf06e9a40e8902418493d69c258dad71e70810612fdc736b0d3e1ea5254b96dcf8c789f61d485270a2733b961891cbe83cfc4362208bf8a97d69cee30fd625d0bcac2dc294b3ba4c8f8adffd7abd5b8c8b9adc7bf3703ede3e0399ff4e9ed64715920fab206e9569d0fa883880d8cc4a2e770edd48916a57dad2182d879303f0f75e584c9b127553364072bc854a619baa70a27ea68eefb76177bac30ceaafb940b729ca4f7620d7453049d6156b0419f4be977ba7799b3c0b5f35f038aac7a755c77a3e42a20af674faf330aa6607972da67c19a26c04a44bd12103">
          <input type="hidden" name="access_code" value="AVDL03ID74AS72LDSA">
        </form>
        
        <script type="text/javascript">
          setTimeout(function() {
            document.server_request.submit();
          }, 2000);
        </script>
      </body>
      </html>
    `;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={[styles.backButton, { backgroundColor: '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="chevron-back" size={22} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Gateway</Text>
        <View style={styles.placeholder} />
      </View>

      {/* WebView */}
      <WebView
        source={{ html: generatePaymentHTML() }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => {}}
        onLoadEnd={() => {}}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.loadingText}>Loading Payment Gateway...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#6C63FF",
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
});

export default PaymentGatewayScreen;
