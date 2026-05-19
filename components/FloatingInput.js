import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FloatingInput({
  label, icon, value, onChangeText,
  secureTextEntry, keyboardType = 'default',
  error, editable = true, rightIcon,
}) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused || value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  // Label positioned relative to container (not inside box)
  // Android does not support overflow:visible so label must be a sibling of the box
  const labelTop   = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 1] });
  const labelSize  = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#EF4444' : '#A0AEC0', error ? '#EF4444' : '#6C63FF'],
  });

  const bgColor     = error ? '#FFF5F5' : '#FAFAFA';
  const borderColor = error ? '#EF4444' : focused ? '#6C63FF' : '#E2E8F0';

  return (
    <View style={s.outer}>
      {/* Wrapper gives space for floating label above box */}
      <View style={s.container}>
        <Animated.Text
          style={[s.label, {
            top: labelTop,
            fontSize: labelSize,
            color: labelColor,
            backgroundColor: bgColor,
          }]}
        >
          {label}
        </Animated.Text>

        <View style={[s.box, { borderColor, backgroundColor: bgColor }]}>
          <View style={s.iconBox}>
            <Ionicons
              name={icon}
              size={18}
              color={error ? '#EF4444' : focused ? '#6C63FF' : '#A0AEC0'}
            />
          </View>
          <TextInput
            style={s.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            editable={editable}
          />
          {rightIcon && <View style={s.rightBox}>{rightIcon}</View>}
        </View>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  outer: { marginBottom: 6 },
  container: {
    position: 'relative',
    paddingTop: 10,   // space for label to float into
  },
  label: {
    position: 'absolute',
    left: 50,
    paddingHorizontal: 4,
    fontWeight: '500',
    zIndex: 10,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 14,
  },
  iconBox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A202C',
    paddingLeft: 8,
    paddingVertical: 0,
    height: '100%',
  },
  rightBox: { paddingLeft: 6 },
  error: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 6 },
});
