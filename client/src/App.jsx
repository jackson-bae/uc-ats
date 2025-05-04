import { useEffect, useState } from 'react'

export default function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    fetch('/api/hello') 
      .then(res => res.json())
      .then(data => setMessage(data.message))
  }, [])

  return <h1>{message}</h1>
}