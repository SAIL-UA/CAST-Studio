// Import dependencies
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import components
import Header from './components/Header';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import Construction from './pages/construction';

// Main App component
function App() {

  //  Visible component
  return (
    <Router>
      <div id="app-container" className="bg-gray-light">
        <Header /> 
            <Routes>
                <Route path='/' element={<Home />} /> {/* TODO: If use auth, send to /home. If not, send to /login */}
                <Route path='/login' element={<Login />} />
                <Route path='/construction' element={<Construction />} />
            </Routes>
      </div>
    </Router>
  );
}

export default App;
