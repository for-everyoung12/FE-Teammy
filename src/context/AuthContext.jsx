import { createContext, useState, useContext, useEffect } from "react";
import { AuthService } from "../services/auth.service";
import {
  connectGroupStatusHub,
  disconnectGroupStatusHub,
} from "../services/groupStatusHub";
import { HttpException } from "../app/toastException/http.exception";
const HTTP_STATUS = {
  BADREQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNALSERVER_ERROR: 500,
};

const AuthContext = createContext(undefined);

const normalizeUserInfo = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    userId: raw.userId,
    email: raw.email,
    displayName: raw.displayName || raw.name || "",
    name: raw.displayName || raw.name || "",
    phone: raw.phone || "",
    gender: raw.gender || "",
    majorId: raw.majorId || "",
    majorName: raw.majorName || "",
    skills: raw.skills || "",
    photoURL:
      raw.avatarUrl || raw.avatarURL || raw.photoURL || raw.photoUrl || "",
    role: raw.role,
    emailVerified: !!raw.emailVerified,
    skillsCompleted: !!raw.skillsCompleted,
    semester: raw.semester || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [role, setRole] = useState(() => {
    const storedRole = localStorage.getItem("role");
    return storedRole && storedRole !== "undefined" ? storedRole : null;
  });

  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token");
    return storedToken || null;
  });

  const [userInfo, setUserInfo] = useState(() => {
    try {
      const storedUserInfo = localStorage.getItem("userInfo");
      if (!storedUserInfo) return null;
      const parsed = JSON.parse(storedUserInfo);
      return normalizeUserInfo(parsed);
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (userInfo) {
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
      } else {
        localStorage.removeItem("userInfo");
      }
    } catch {
      /* empty */
    }
  }, [userInfo]);

  const loginGoogle = async (idToken) => {
    try {
      const response = await AuthService.login({ idToken });

      const token = response.data?.accessToken || response.data?.token;
      if (!token) {
        throw new Error("Invalid Google login response");
      }

      const user = await handleLogin(token);

      return user;
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            "Failed to login with Google",
            HTTP_STATUS.INTERNALSERVER_ERROR,
          );
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const response = await AuthService.loginWithEmail({ email, password });

      const token = response.data?.accessToken || response.data?.token;
      if (!token) {
        throw new Error("Invalid login response");
      }

      const user = await handleLogin(token);

      return user;
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            "Failed to login with email",
            HTTP_STATUS.INTERNALSERVER_ERROR,
          );
    }
  };

  const register = async (email, password, displayName) => {
    try {
      const response = await AuthService.register({
        email,
        password,
        displayName,
      });

      const token = response.data?.accessToken || response.data?.token;
      if (!token) {
        throw new Error("Invalid registration response");
      }

      const user = await handleLogin(token);

      return user;
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            "Failed to register",
            HTTP_STATUS.INTERNALSERVER_ERROR,
          );
    }
  };

  const handleLogin = async (token, userFromLogin = null) => {
    try {
      if (!token)
        throw new HttpException("No token provided", HTTP_STATUS.UNAUTHORIZED);

      localStorage.setItem("token", token);
      setToken(token);

      let userData = userFromLogin;

      if (!userData) {
        const response = await AuthService.me();
        userData = response.data;
      }

      if (!userData) throw new Error("No user info");

      const normalized = normalizeUserInfo(userData);

      // Normalize role to a single lowercase string without common prefixes
      let roleVal = normalized.role;
      if (Array.isArray(roleVal)) roleVal = roleVal[0];
      roleVal = String(roleVal || "")
        .toLowerCase()
        .replace(/^role[_-]?/i, "");

      setUserInfo(normalized);
      setRole(roleVal || null);

      localStorage.setItem("userInfo", JSON.stringify(normalized));
      if (roleVal) localStorage.setItem("role", roleVal);

      // Sau khi login thành công, connect tới GroupStatus hub với JWT hiện tại
      connectGroupStatusHub(token).catch((err) => {
        console.warn("Failed to connect GroupStatus hub", err);
      });

      return normalized;
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            "Failed to get user info",
            HTTP_STATUS.INTERNALSERVER_ERROR,
          );
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserInfo(null);
    localStorage.clear();
    // Ngắt kết nối SignalR khi user logout
    disconnectGroupStatusHub().catch(() => {});
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reconnect SignalR on page refresh when token is already in storage
  useEffect(() => {
    if (!token) return;
    connectGroupStatusHub(token)
      .then(() => {
        console.log(
          "[AuthContext] GroupStatus hub connected (rehydrated token)",
        );
      })
      .catch((err) => {
        console.warn("[AuthContext] Failed to reconnect GroupStatus hub", err);
      });
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        token,
        setToken,
        userInfo,
        setUserInfo,
        isLoading,
        setIsLoading,
        handleLogin,
        logout,
        loginGoogle,
        loginWithEmail,
        register,
        notifications,
        setNotifications,
        unreadCount,
        setUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new HttpException(
      "useAuth must be used within an AuthProvider",
      HTTP_STATUS.INTERNALSERVER_ERROR,
    );
  }
  return context;
};
