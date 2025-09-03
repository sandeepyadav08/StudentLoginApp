# Student Login App

A responsive React Native Expo app with a beautiful purple-themed login screen designed for students.

## Features

- ✅ **Beautiful Purple Theme** - Modern, elegant design matching your specifications
- ✅ **Welcome Back Interface** - "Welcome Back!" title with journey subtitle
- ✅ **Sign In Form** - Clean white card with "Sign In" header
- ✅ **Responsive Layout** - Works perfectly on phones, tablets, and web
- ✅ **Form Validation** - Real-time email format and password length validation
- ✅ **Password Visibility Toggle** - Purple eye icon to show/hide password
- ✅ **Remember Me Checkbox** - Custom purple checkbox with functionality
- ✅ **Complete Forgot Password Flow** - 4-step password recovery process
- ✅ **OTP Verification Screen** - 4-digit OTP input with auto-focus
- ✅ **Reset Password Screen** - New password with strength indicator
- ✅ **Screen Navigation** - Smooth transitions between all screens
- ✅ **Purple Login Button** - Prominent "LOGIN" button with shadow effects
- ✅ **Mobile Optimized** - Perfectly optimized for phone screens
- ✅ **StatusBar Fixed** - No more StatusBar warnings, properly handled
- ✅ **API Integration** - Ready for backend integration
- ✅ **Loading States** - Shows loading indicator during login
- ✅ **Error Handling** - Displays validation and API errors
- ✅ **Keyboard Handling** - Proper keyboard avoidance
- ✅ **Demo Credentials** - Built-in test accounts

## Demo Credentials

For testing purposes, you can use these accounts:

**Account 1:**
- Email: `student@example.com`
- Password: `password123`

**Account 2:**
- Email: `jane@student.edu`
- Password: `student456`

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (optional, for testing)

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd StudentLoginApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Choose your platform:
   - Press `w` to open in web browser
   - Press `a` to open Android emulator
   - Press `i` to open iOS simulator
   - Scan QR code with Expo Go app on your phone

## API Integration

### Current Implementation

The app currently uses dummy API calls located in `services/api.js`. This allows you to test the login functionality without a backend.

### Replacing with Real API

To integrate with your actual backend:

1. Open `services/api.js`
2. Update the `API_BASE_URL` constant with your API endpoint
3. Uncomment the real API implementation
4. Comment out the dummy implementation
5. Modify the API calls to match your backend structure

Example real API implementation:
```javascript
export const loginAPI = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data;
  } catch (error) {
    throw {
      success: false,
      message: error.message || 'Network error occurred',
      errors: error.errors || {}
    };
  }
};
```

### Expected API Response Format

Your backend should return responses in this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "name": "John Student",
    "role": "student",
    "studentId": "STU2024001"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": {
    "credentials": "Email or password is incorrect"
  }
}
```

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

## Adding Features

### Persistent Login (AsyncStorage)

To save user login state:

1. Install AsyncStorage:
   ```bash
   expo install @react-native-async-storage/async-storage
   ```

2. Import in `App.js`:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   ```

3. Uncomment the AsyncStorage lines in the `handleLogin` function

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

## Support

For questions or issues with the app setup, please check:

1. Expo documentation: https://docs.expo.dev/
2. React Native documentation: https://reactnative.dev/docs/getting-started

## Next Steps

After completing the login screen, you can:

1. Add navigation to main app screens
2. Implement user profile management
3. Add biometric authentication
4. Create registration screen
5. Add social login options
6. Implement offline functionality

The app is designed to be easily extensible for additional features!
