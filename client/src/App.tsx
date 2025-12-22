import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { JSX } from 'react/jsx-runtime';
import './App.css';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
