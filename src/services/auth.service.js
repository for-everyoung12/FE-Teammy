// services/auth.service.js
import { BaseService } from "../config/basic.service";
import { API } from "../consts/path.api";

export const AuthService = {
  login({ idToken } = {}) {
    return BaseService.post({
      url: API.AUTH.LOGIN,
      payload: { IdToken: idToken },
      isLoading: true,
    });
  },
  loginWithEmail({ email, password } = {}) {
    return BaseService.post({
      url: API.AUTH.LOGIN_EMAIL,
      payload: { email, password },
      isLoading: true,
    });
  },
  register({ email, password, displayName } = {}) {
    return BaseService.post({
      url: API.AUTH.REGISTER,
      payload: { email, password, displayName },
      isLoading: true,
    });
  },
  getMembership() {
    return BaseService.get({
      url: API.GROUPS.MEMBERSHIP,
      isLoading: true,
    });
  },
  me() {
    return BaseService.get({
      url: API.AUTH.ME,
      isLoading: true,
    });
  },

};
  