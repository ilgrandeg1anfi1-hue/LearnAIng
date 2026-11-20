import { useEffect, useState } from 'react'

export default function App() {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.api.getVersion().then(setVersion)
  }, [])

  return (
    <main>
      <h1>LearnAIng</h1>
      <p>{version && `v${version}`}</p>
    </main>
  )
}
