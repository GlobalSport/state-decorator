import React from 'react';
import ReactDOM from 'react-dom/client';
import TodoApp from './TodoApp';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TodoApp />
  </React.StrictMode>
);

/*

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root') as HTMLElement
);

*/
