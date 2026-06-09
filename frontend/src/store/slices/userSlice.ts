import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { DashboardStats, Project, Generation } from '@/types'

interface UserState {
  stats: DashboardStats | null
  projects: Project[]
  recentGenerations: Generation[]
  isLoading: boolean
}

const initialState: UserState = {
  stats: null,
  projects: [],
  recentGenerations: [],
  isLoading: false,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setStats(state, action: PayloadAction<DashboardStats>) {
      state.stats = action.payload
    },
    setProjects(state, action: PayloadAction<Project[]>) {
      state.projects = action.payload
    },
    setRecentGenerations(state, action: PayloadAction<Generation[]>) {
      state.recentGenerations = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { setStats, setProjects, setRecentGenerations, setLoading } = userSlice.actions
export default userSlice.reducer
