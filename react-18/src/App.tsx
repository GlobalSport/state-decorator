import { useState } from 'react';
import './App.css';
import { SlowValue, TextBox } from './Component';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <TextBox />
      <SlowValue />
      <SlowValue />
      <SlowValue />
      <SlowValue />
      <SlowValue />
      <SlowValue />
      <SlowValue />
      <SlowValue />
      <SlowValue />
    </div>
  );
}

export default App;
