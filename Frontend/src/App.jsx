import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import UserLogin from './pages/UserLogin'
import UserSignup from './pages/UserSignup'
import CaptainLogin from './pages/CaptainLogin'
import Captainsignup from './pages/Captainsignup'
import UserHome from './pages/UserHome'
import CaptainHome from './pages/CaptainHome'
import UserProtectedWrapper from './components/UserProtectedWrapper'
import CaptainProtectedWrapper from './components/CaptainProtectedWrapper'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/signup" element={<UserSignup />} />
        <Route path="/captain-login" element={<CaptainLogin />} />
        <Route path="/captain-signup" element={<Captainsignup />} />

        <Route
          path="/home"
          element={
            <UserProtectedWrapper>
              <UserHome />
            </UserProtectedWrapper>
          }
        />

        <Route
          path="/captain-home"
          element={
            <CaptainProtectedWrapper>
              <CaptainHome />
            </CaptainProtectedWrapper>
          }
        />
      </Routes>
    </div>
  )
}

export default App
