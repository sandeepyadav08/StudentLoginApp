//import jwtDecode from "jwt-decode";

// API Service for Student Login App
const API_BASE_URL = "http://192.168.29.217/iimt-application/api/portal";

export const loginAPI = async (email, password) => {
  let formData = new FormData();
  formData.append("login_email", email);
  formData.append("login_password", password);

  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status == 200) {
        return {
          success: true,
          token: data._Token,
          message: data.message,
          user: {
            email: email,
          },
        };
      }

      return {
        success: false,
        message: data.message,
        user: {
          email: email,
        },
      };
    })
    .catch((error) => {
      return {
        success: false,
        message:'Somthing Went Wrong...',
        user: {
          email: email,
        },
      };
    });

  return response;
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

    console.log("Forgot Password Response:", {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (!response.ok || (data.status !== 200 && data.status !== 201)) {
      throw new Error(data.message || "User not found. Please check your email address.");
    }

    return {
      success: true,
      message: data.message || "OTP has been sent to your email",
      otpSent: true,
      email: email,
    };
  } catch (error) {
    // Log at info level in development if needed
    // console.log("Forgot Password Error:", error);
    // Throw an Error object with the proper message
    throw new Error(error.message || "User not found or network error occurred");
  }
};

// OTP Verification and Password Update API (combined - server updates password during OTP verification)
export const verifyOtpAndUpdatePasswordAPI = async (email, otp, newPassword) => {
  try {
    let formData = new FormData();
    formData.append("otp", otp);
    formData.append("email_id", email);
    
    // Include password fields - server updates password during OTP verification
    if (newPassword) {
      formData.append("password", newPassword);
      formData.append("confirm_password", newPassword);
    }

    console.log("OTP Verification with Password Update Request:", {
      url: `${API_BASE_URL}/otp-verify`,
      email: email,
      otp: otp,
      hasPassword: !!newPassword,
    });

    const response = await fetch(`${API_BASE_URL}/otp-verify`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    console.log("OTP Verification with Password Update Response:", {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (!response.ok || (data.status !== 200 && data.status !== 201)) {
      throw new Error(data.message || data.error || "Invalid OTP. Please try again.");
    }

    return {
      success: true,
      message: data.message || (newPassword ? "Password updated successfully" : "OTP verified successfully"),
      email: email,
      otp: otp,
      passwordUpdated: !!newPassword,
    };
  } catch (error) {
    // console.log("OTP Verification Error:", error);
    // Throw an Error object with the proper message
    throw new Error(error.message || "Invalid OTP. Please try again.");
  }
};

// OTP Verification Only API (just check if OTP is valid - for cases where we don't want to update password yet)
export const verifyOtpOnlyAPI = async (email, otp) => {
  try {
    let formData = new FormData();
    formData.append("otp", otp);
    formData.append("email_id", email);

    console.log("OTP Verification Only Request:", {
      url: `${API_BASE_URL}/otp-verify`,
      email: email,
      otp: otp,
    });

    const response = await fetch(`${API_BASE_URL}/otp-verify`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    console.log("OTP Verification Only Response:", {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (!response.ok || (data.status !== 200 && data.status !== 201)) {
      throw new Error(data.message || data.error || "Invalid OTP. Please try again.");
    }

    return {
      success: true,
      message: data.message || "OTP verified successfully",
      email: email,
      otp: otp,
    };
  } catch (error) {
    // console.log("OTP Verification Error:", error);
    // Throw an Error object with the proper message
    throw new Error(error.message || "Invalid OTP. Please try again.");
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

    if (!response.ok || (data.status !== 200 && data.status !== 201)) {
      throw new Error(data.message || data.error || "OTP verification failed");
    }

    return {
      success: true,
      message: data.message || (newPassword ? "Password reset successfully" : "OTP verified successfully"),
      token: data.token || otp,
      email: email,
      isPasswordReset: !!newPassword,
    };
  } catch (error) {
    // console.log("OTP Verify Error:", error);
    // Throw an Error object with the proper message
    throw new Error(error.message || "Network error occurred");
  }
};

// Password Reset API - wrapper around the combined OTP verification and password update
export const resetPasswordAPI = async (email, otpToken, newPassword) => {
  try {
    // Use the combined API since server updates password during OTP verification
    return await verifyOtpAndUpdatePasswordAPI(email, otpToken, newPassword);
  } catch (error) {
    // Throw an Error object with the proper message
    throw new Error(error.message || "Failed to reset password. Please try again.");
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

// File Upload API
export const uploadFileAPI = async (fileData, token) => {
  try {
    // const fileObj = JSON.parse(fileData);
    // console.log('Parsed file object:', fileObj);

    const formData = new FormData();

    // Create proper React Native file object for FormData
    // Use the exact format React Native expects
    formData.append("Filedata", {
      uri: fileData.uri,
      type: fileData.mimeType || "image/jpeg",
      name: fileData.name,
    });
    formData.append("location", "public/uploads/helpdesk-docs/");
    formData.append("app_post", "");
    formData.append("allow_ext", "jpg,jpeg,png");
    formData.append("timestamp", "1756960111");
    formData.append("token", "2c16b02e53f093adbfc002542a63b893"); // Add token as form parameter
    formData.append("filename", "helpdesk_file");

    console.log(
      "Uploading file:",
      fileData.name,
      "with token:",
      token?.substring(0, 20) + "..."
    );

    const response = await fetch(`${API_BASE_URL}/upload-file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type header - let browser handle it for multipart/form-data
      },
      body: formData,
    });

    console.log("Upload response status:", response.status);
    console.log("Upload response ok:", response.ok);

    const responseText = await response.text();
    console.log("Upload response text:", responseText);

    let data;

    try {
      data = JSON.parse(responseText);
      console.log("Upload parsed response:", data);
    } catch (parseError) {
      console.error("Failed to parse response:", responseText);
      throw new Error("Invalid server response: " + responseText.slice(0, 100));
    }

    if (!response.ok || (data.status !== 201 && data.status !== 200)) {
      throw new Error(data.message || data.error || "File upload failed");
    }

    return {
      success: true,
      message: data.message || "File uploaded successfully",
      filename: data.filename,
      file: fileData.name,
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// File Delete API - Simplified version with proper error handling
export const deleteFileAPI = async (filename, token) => {
  try {
    if (!filename) {
      throw new Error("Filename is required for deletion");
    }
    console.log(filename);
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const formData = new FormData();
    formData.append("filename", filename);

    console.log("Deleting file:", filename);
    console.log("Delete API endpoint:", `${API_BASE_URL}/delete-file`);

    const response = await fetch(`${API_BASE_URL}/delete-file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log("Delete API response text:", responseText);
    console.log("Delete API response status:", response.status);

    // Handle "No data Found" specifically - this is actually SUCCESS
    // because it means the file doesn't exist (which is our goal)
    if (responseText.toLowerCase().includes("no data found")) {
      console.log("File not found on server - treating as successful deletion");
      return {
        success: true,
        message: "File removed successfully (file was not found on server)",
      };
    }

    // Try to parse JSON response
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Delete API parsed response:", data);
    } catch (parseError) {
      // Handle plain text responses
      if (
        response.ok &&
        (responseText.toLowerCase().includes("success") ||
          responseText.toLowerCase().includes("deleted"))
      ) {
        return {
          success: true,
          message: responseText || "File deleted successfully",
        };
      }

      // If it's not a success response, treat it as an error
      throw new Error(responseText || "Unknown server response");
    }

    // Handle JSON responses
    if (response.ok || response.status === 200) {
      // Check for "No data Found" in JSON response
      if (
        data.message &&
        data.message.toLowerCase().includes("no data found")
      ) {
        console.log(
          "File not found in JSON response - treating as successful deletion"
        );
        return {
          success: true,
          message: "File removed successfully (file was not found on server)",
        };
      }

      return {
        success: true,
        message: data.message || "File deleted successfully",
      };
    }

    // Handle error responses
    throw new Error(data.message || data.error || "File deletion failed");
  } catch (error) {
    console.error("Delete error:", error);

    // Special handling for "No data Found" errors - treat as success
    if (
      error.message &&
      error.message.toLowerCase().includes("no data found")
    ) {
      console.log(
        'Caught "No data Found" error - treating as successful deletion'
      );
      return {
        success: true,
        message: "File removed successfully (file was not found on server)",
      };
    }

    // For all other errors, throw them
    throw {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

// Save Ticket API
export const saveTicketAPI = async (ticketData, token) => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const formData = new FormData();
    formData.append("category", ticketData.category || "");
    formData.append("sub_category", ticketData.subCategory || "");
    formData.append("description", ticketData.description || "");

    // Always include doc_file parameter, even if empty
    formData.append("doc_file", ticketData.docFile || "");

    // Add missing date/time parameters that server expects
    formData.append("start_date", ticketData.startDate || "");
    formData.append("start_time", ticketData.startTime || "");
    formData.append("end_time", ticketData.endTime || "");
    formData.append("available_date", ticketData.availableDate || "");
    formData.append("available_time_from", ticketData.availableTimeFrom || "");
    formData.append("available_time_to", ticketData.availableTimeTo || "");

    // Add comprehensive time/date parameters that server might expect
    const timeValue = ticketData.time || ticketData.availableTimeFrom || "";
    const dateValue = ticketData.date || ticketData.availableDate || "";

    formData.append("time", timeValue);
    formData.append("date", dateValue);
    formData.append("booking_time", timeValue);
    formData.append("booking_date", dateValue);
    formData.append("preferred_time", timeValue);
    formData.append("preferred_date", dateValue);
    formData.append("visit_time", timeValue);
    formData.append("visit_date", dateValue);

    // Add common fields that servers often expect
    formData.append("status", "open");
    formData.append("priority", "normal");
    formData.append("source", "mobile_app");

    // Use 'ticket_id' instead of 'ticketId' to match server expectations
    formData.append("ticket_id", ticketData.ticketId || "");

    // Debug: Log all FormData entries
    console.log("Saving ticket with data:", {
      category: ticketData.category,
      sub_category: ticketData.subCategory,
      description: ticketData.description?.substring(0, 50),
      doc_file: ticketData.docFile || "none",
      ticket_id: ticketData.ticketId || "new",
      time: timeValue,
      date: dateValue,
    });

    // Debug: Log all FormData parameters being sent
    console.log("All FormData parameters:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const response = await fetch(`${API_BASE_URL}/save-tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse save ticket response:", responseText);
      throw new Error("Invalid server response: " + responseText.slice(0, 100));
    }

    if (!response.ok || (data.status !== 201 && data.status !== 200)) {
      throw new Error(data.message || data.error || "Failed to save ticket");
    }

    return {
      success: true,
      message: data.message || "Ticket saved successfully",
      ticketId: data.ticketId || data.ticket_id || data.id,
    };
  } catch (error) {
    console.error("Save ticket error:", error);
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
