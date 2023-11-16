import { Debug, useContactMaterial } from '@react-three/cannon'
import Floor from './Floor'
import Obstacles from './Obstacles'
import Player from './Player'
import { useControls } from 'leva'
import Box from './Box'

function ToggleDebug({ children }) {
  const debugRendererVisible = useControls('Debug Renderer', { visible: false })

  return <>{debugRendererVisible.visible ? <Debug color={0x008800}>{children}</Debug> : <>{children}</>}</>
}

export default function Game() {
  useContactMaterial('ground', 'slippery', {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  })

  return (
    <>
      <ToggleDebug>
        <Floor />
        <Box />
        <Player position={[0, 1, 0]} />
      </ToggleDebug>
    </>
  )
}
