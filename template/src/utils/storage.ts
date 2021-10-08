import Store, { StoreAPI } from 'store2'

export interface StoreInstance extends StoreAPI {
  session: (...args: any[]) => any
}

export const Storage = Store.namespace(import.meta.env.VITE_PROJECT_NAME as string) as StoreInstance
