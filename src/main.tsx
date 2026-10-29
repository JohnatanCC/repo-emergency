import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { installDebugApi } from './game/debug'
import { Gallery } from './dev/Gallery'

installDebugApi()

// dev: ?galeria mostra só os modelos das criaturas
const gallery = import.meta.env.DEV && new URLSearchParams(location.search).has('galeria')

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{gallery ? <Gallery /> : <App />}</React.StrictMode>)
