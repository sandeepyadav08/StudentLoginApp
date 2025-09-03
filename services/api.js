import jwtDecode from "jwt-decode";

// API Service for Student Login App
const API_BASE_URL = "http://192.168.29.217/iimt-application/api/portal";

export const loginAPI = async (email, password) => {

  try {
    let formData = new FormData();
    formData.append("login_email", email);
    formData.append("login_password", password);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.status !== 200) {
      throw new Error(data.message || "Login failed");
    }

    return {
      success: true,
      token: data._Token,
      message: data.message,
      user: {
        email: email,
      },
    };
  } catch (error) {
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// Forgot Password API
export const forgotPasswordAPI = async (email) => {
  try {
    let formData = new FormData();
    formData.append("email_id", email);

    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send reset OTP");
    }

    return {
      success: true,
      message: data.message,
      otpSent: true,
      email: email,
    };
  } catch (error) {
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// Verify OTP and Reset Password API (combined)
export const verifyOtpAPI = async (email, otp, newPassword = null) => {
  try {
    let formData = new FormData();
    formData.append("otp", otp);
    formData.append("email_id", email);

    const passwordToUse = newPassword || "temp123456";
    formData.append("password", passwordToUse);
    formData.append("confirm_password", passwordToUse);

    console.log("OTP Verify Request:", {
      url: `${API_BASE_URL}/otp-verify`,
      email: email,
      otp: otp,
      isPasswordReset: !!newPassword,
    });

    const response = await fetch(`${API_BASE_URL}/otp-verify`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    console.log("OTP Verify Response:", {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (!response.ok || data.status !== 200) {
      throw new Error(data.message || data.error || "OTP verification failed");
    }

    return {
      success: true,
      message: data.message,
      token: data.token || otp,
      email: email,
      isPasswordReset: !!newPassword,
    };
  } catch (error) {
    console.error("OTP Verify Error:", error);
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// Reset Password API (uses the same OTP verify endpoint with new password)
export const resetPasswordAPI = async (email, otpToken, newPassword) => {
  try {
    return await verifyOtpAPI(email, otpToken, newPassword);
  } catch (error) {
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

export const validateTokenAPI = async (token) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        valid:
          token === "dummy-jwt-token-12345" ||
          token === "dummy-jwt-token-67890",
      });
    }, 500);
  });
};

// Payment History API
export const getPaymentHistoryAPI = async (token, paymentStatus = "") => {
  const formData = new FormData();
  formData.append("payment_status", paymentStatus);
  formData.append("payment_type", 7);
  formData.append("start", 0);
  formData.append("length", 10);

  try {
    const response = await fetch(`${API_BASE_URL}/payment-history`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
      console.log(data);
    } catch {
      throw new Error(
        "Server did not return valid JSON: " + text.slice(0, 100)
      );
    }

    if (!response.ok || data.status !== 200) {
      throw new Error(data.message || "Failed to fetch payment history");
    }

    const history = (data.res?.data || []).map((row, index) => {
      const [
        id,
        bankName,
        amount,
        for_payment,
        description,
        txnId,
        mode,
        dmyDate,
        status,
      ] = row;
      return {
        id: index + 1,
        parent_id: id,
        bank_name: bankName,
        amount: Number(amount),
        for_payment,
        description,
        transaction_id: txnId,
        payment_method: mode,
        date: dmyDate,
        status: status,
      };
    });

    return { success: true, data: history, message: data.message };
  } catch (error) {
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// Get-utility-detail API
export const getPaymentDetailsAPI = async (token, paymentId) => {
  const formData = new FormData();
  formData.append("id", paymentId);

  try {
    const response = await fetch(`${API_BASE_URL}/get-utility-detail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
      console.log("Payment Details Response:", data);
    } catch {
      throw new Error(
        "Server did not return valid JSON: " + text.slice(0, 100)
      );
    }

    if (!response.ok || data.status !== 200) {
      throw new Error(data.message || "Failed to fetch payment details");
    }

    return {
      success: true,
      html: data.html,
      message: data.message,
    };
  } catch (error) {
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// helper function to map status codes
const getStatusLabel = (status) => {
  switch (String(status)) {
    case "0":
      return "Pending";
    case "1":
      return "Success";
    case "2":
      return "Fail";
    case "3":
      return "Processing";
    default:
      return "Unknown";
  }
};

// Logout API
export const logoutAPI = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Logout failed");
    }

    return {
      success: true,
      message: data.message || "Logged out successfully",
    };
  } catch (error) {
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

//// export const decodetoken = async () => {
//   // Example JWT token (from your login API)
//   const token =
//     "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJsb2NhbGhvc3QiLCJhdWQiOiJsb2NhbGhvc3QiLCJpYXQiOjE3NTY3ODc5ODMsImV4cCI6MTc2MTk3MTk4Mywic3ViIjoiNyIsImp0aSI6IjM3NmE1NmE0YmM5ZjQ4OGYiLCJkYXRhIjp7ImlkIjoiNyIsIm5hbWUiOiJSYWh1bCBWIiwiZW1haWwiOiJ5YWRhdnNhbmRlZXBAZGFydGV3ZWIuaW4iLCJtb2JpbGUiOiIxMjM0NTY3ODk2IiwiZG9iIjpudWxsfX0.eSvygQojgEy9kInfX4n6kukT4hoMoYxlPcGnd-Lytr0";

//     const secret = "xyz"; // ❌ not safe in frontend!
    
//     try {
//       const decoded = jwt.verify(token, secret);
//       console.log("Decoded:", decoded);
//     } catch (err) {
//       console.error("Token invalid:", err.message);
//     }
// };
