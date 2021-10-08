import request from '/src/utils/request'

/** 获取用户信息 */
export const getUserInfo = () => {
  return request({
    url: '/v1/users/info'
  })
}
