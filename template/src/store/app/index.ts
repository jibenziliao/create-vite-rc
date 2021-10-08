import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'

const initialState: App.State = {
  loading: true
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    }
  }
})

export const { setLoading } = appSlice.actions

export const appState = (state: RootState) => state.app

export default appSlice.reducer
