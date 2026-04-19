import { Routes, Route } from "react-router-dom"
import Register from './pages/register.tsx'
import Home from './pages/home.tsx'

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Home />} />
       
    </Routes>
  )
}

export default App