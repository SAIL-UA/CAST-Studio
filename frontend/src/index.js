import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import App from './components/App';
import 'bootstrap/dist/css/bootstrap.min.css'; // Include Bootstrap CSS
import './index.css'; // Include custom styles if needed

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <DndProvider backend={HTML5Backend}>
        <App />
      </DndProvider>
    </Router>
  </React.StrictMode>
);
