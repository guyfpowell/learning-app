import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

/** A reply as axios hands it to the caller. */
export function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
}

/**
 * A failed request as axios rejects it. With no `status` it never got an answer (a network error
 * or a timeout); with one, the server answered with that status and `data` as its body.
 */
export function axiosError(code: string, status?: number, data: unknown = null, config?: InternalAxiosRequestConfig): AxiosError {
  const response = status === undefined ? undefined : axiosResponse(data, status);
  return new AxiosError('failed', code, config, undefined, response);
}
