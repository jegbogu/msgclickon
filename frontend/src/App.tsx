import { Routes, Route } from "react-router-dom"
import EmailVerification from "./pages/email-verification.tsx"
import Register from './pages/register.tsx'
import Home from './pages/home.tsx'

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/email-verification" element={<EmailVerification />} />
      <Route path="/" element={<Home />} />
       
    </Routes>
  )
}

export default App