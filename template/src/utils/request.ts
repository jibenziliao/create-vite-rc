import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance, AxiosError } from 'axios'
import Qs from 'qs'
import { message, Modal } from 'antd'
import { ArgsProps } from 'antd/lib/message'

const messageStack: Record<string, boolean> = {}
export const errorMessage = (...args: Parameters<typeof message.error>) => {
  // 如果消息存在则推出
  const msg = (typeof args[0] === 'string' ? args[0] : (args[0] as ArgsProps).content) as string
  if (messageStack[msg]) {
    return false
  }
  messageStack[msg] = true
  message.error(...args).then(() => {
    delete messageStack[msg]
  })
}
/** token过期错误提示次数(token过期时，一个页面可能会有多次请求，只显示第一次的错误提示) */
let expiredCount = 0

/** token过期处理 */
const tokenExpired = () => {
  if (!expiredCount) {
    expiredCount += 1
    Modal.error({
      title: '你的登录信息已过期',
      content: '因长时间未操作，你的登录信息已过期，点击确定重新登录。',
      okText: '确定',
      onOk: () => {
        // TODO: logout
      }
    })
  }
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_PREFIX as string,
  timeout: parseInt(import.meta.env.VITE_TIMEOUT + ''),
  paramsSerializer: arg => {
    // https://github.com/ljharb/qs
    // https://blog.csdn.net/pifutan/article/details/86320705
    return Qs.stringify(arg, { arrayFormat: 'repeat' })
  }
})

service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    return config
  },
  (error: AxiosError) => {
    Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    if (res?.code === 401) {
      tokenExpired()
      return Promise.reject(res)
    }
    if (res?.code !== 0 && res?.code !== undefined) {
      errorMessage({
        content: res?.message || '网络异常，请重试！',
        duration: 5
      })
      return Promise.reject(res)
    }
    return response
  },
  (error: AxiosError) => {
    if (error?.response?.status === 401) {
      tokenExpired()
      return Promise.reject(error)
    } else if (error.message.includes('timeout')) {
      const result = {
        data: { msg: '请求超时' },
        status: 408,
        statusText: '请求超时',
        headers: error.config.headers,
        config: error.config
      }
      errorMessage({
        content: result.statusText,
        duration: 5
      })
      return Promise.reject(result)
    }
    errorMessage({
      content: error.response?.data.message || error.message,
      duration: 5
    })
    return Promise.reject(error)
  }
)

export default service
