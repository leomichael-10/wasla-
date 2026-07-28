'use client'
import { createContext, useContext, useState, useCallback } from 'react'

const UserContext = createContext(null)

export function UserProvider({ initialUser, children }) {
  const [user, setUser] = useState(initialUser ?? null)

  const login = useCallback((userData) => {
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    document.cookie = 'wasla_user_info=; path=/; max-age=0'
    localStorage.removeItem('wasla_token')
    localStorage.removeItem('wasla_user')
  }, [])

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
