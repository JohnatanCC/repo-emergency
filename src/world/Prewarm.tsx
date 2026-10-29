import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { GuardiaModel } from '../enemies/models/GuardiaModel'
import { SombraModel } from '../enemies/models/SombraModel'
import { PossessorModel } from '../enemies/models/PossessorModel'
import { CoisaModel } from '../enemies/models/CoisaModel'
import { newPose } from '../enemies/models/pose'

/**
 * Compila os shaders de tudo que ainda vai aparecer (criaturas) junto com o
 * nível, longe da vista, e some. Sem isso o jogo trava um instante na primeira
 * vez que cada criatura entra em cena — justo na hora do susto.
 */
export function Prewarm({ version }: { version: unknown }) {
  const { gl, scene, camera } = useThree()
  const [done, setDone] = useState(false)
  const pose = useMemo(newPose, [])

  useEffect(() => setDone(false), [version])
  useEffect(() => {
    if (done) return
    // compila o que está na cena (o nível e estes modelos) e desmonta os modelos
    gl.compile(scene, camera)
    setDone(true)
  }, [done, gl, scene, camera])

  if (done) return null
  return (
    <group position={[0, -50, 0]}>
      <GuardiaModel pose={pose} />
      <SombraModel pose={pose} />
      <PossessorModel pose={pose} />
      <CoisaModel pose={pose} />
    </group>
  )
}
