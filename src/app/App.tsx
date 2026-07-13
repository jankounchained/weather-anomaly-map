import './App.css'
import { LocationPanel } from './LocationPanel'

function App() {
  return (
    <div className="app-shell">
      <div className="map-region" />
      <LocationPanel />
    </div>
  )
}

export default App
