# Student Login App

A responsive React Native Expo app  designed for students.

## Features
- ✅ **Responsive Layout** - Works perfectly on phones, tablets, and web
- ✅ **Form Validation** - Real-time email format and password length validation
- ✅ **Password Visibility Toggle** - Eye icon to show/hide password
- ✅ **Remember Me Checkbox** - Custom purple checkbox with functionality
- ✅ **Complete Forgot Password Flow** - 4-step password recovery process
- ✅ **OTP Verification Screen** - 4-digit OTP input with auto-focus
- ✅ **Reset Password Screen** - New password with strength indicator
- ✅ **Screen Navigation** - Smooth transitions between all screens
- ✅ **Mobile Optimized** - Perfectly optimized for phone screens
- ✅ **API Integration** - Ready for backend integration
- ✅ **Error Handling** - Displays validation and API errors
  
### Prerequisites

- Node.js (v14 or higher)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (optional, for testing)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   or
   npx expo start 
   ```

4. Choose your platform:
   - Press `w` to open in web browser
   - Press `a` to open Android emulator
   - Press `i` to open iOS simulator
   - Scan QR code with Expo Go app on your phone

## File Structure

```
StudentLoginApp/
├── App.js                         # Main navigation component
├── screens/
│   ├── LoginScreen.js             # Login screen component
│   ├── ForgotPasswordScreen.js    # Forgot password screen
│   ├── OtpVerificationScreen.js   # OTP verification screen
│   └── ResetPasswordScreen.js     # Reset password screen
├── services/
│   └── api.js                     # API service functions
├── package.json
└── README.md
```

## Customization

### Colors and Styling

All styles are defined in the `StyleSheet` object in `App.js`. Key design tokens:

- **Primary purple**: `#7c3aed` (buttons, titles, accents)
- **Background**: `#f3e8ff` (light purple background)
- **Card background**: `#ffffff` (white form card)
- **Error color**: `#ef4444` (validation errors)
- **Text colors**: 
  - Dark: `#374151` (main text)
  - Medium: `#6b7280` (subtitle, secondary text)
  - Light: `#9ca3af` (placeholder text)
- **Border colors**: `#d1d5db` (input borders)

### Validation Rules

Current validation rules:
- Email: Must be a valid email format
- Password: Minimum 6 characters

To modify validation, update the `validateEmail` and `validatePassword` functions in `App.js`.

### Responsive Breakpoints

The app uses `Dimensions.get('window').width > 768` to detect larger screens and adjusts:
- Font sizes
- Padding values
- Form width

### Navigation

To add multiple screens:

1. Install React Navigation:
   ```bash
   npm install @react-navigation/native @react-navigation/stack
   expo install react-native-screens react-native-safe-area-context
   ```

2. Set up navigation structure to move to main app after login

### Forgot Password

The "Forgot Password?" button is already in place. To implement:

1. Update the `forgotPasswordAPI` function in `services/api.js`
2. Add navigation to a forgot password screen
3. Handle the forgot password flow

## Testing

The app includes comprehensive form validation and error handling. Test scenarios:

### Login Flow:
1. **Empty fields** - Shows required field errors
2. **Invalid email** - Shows email format error  
3. **Short password** - Shows minimum length error
4. **Wrong credentials** - Shows API error message
5. **Valid credentials** - Shows success message

### Forgot Password Flow:
1. **Step 1 - Forgot Password**: 
   - Click "Forgot password?" link
   - Enter any valid email format
   - Click "SEND OTP" → Shows success message

2. **Step 2 - OTP Verification**:
   - Enter OTP: `1234` (demo OTP)
   - Auto-focuses to next input box
   - Click "VERIFY OTP" → Shows success message

3. **Step 3 - Reset Password**:
   - Enter new password (minimum 8 characters)
   - Watch password strength indicator
   - Confirm password (must match)
   - Click "RESET PASSWORD" → Shows success message

4. **Step 4 - Back to Login**:
   - Returns to login screen
   - Can now login with new password

## 🤝 Support
For issues, suggestions, or contributions, please open an issue or PR.
The app is designed to be easily extensible for additional features!