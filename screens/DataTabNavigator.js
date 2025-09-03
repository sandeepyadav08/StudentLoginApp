import React from 'react';
import PaymentHistoryScreen from './PaymentHistoryScreen';

export default function DataTabNavigator({ navigation }) {
  // ✅ Directly render PaymentHistoryScreen
  return <PaymentHistoryScreen navigation={navigation} />;
}