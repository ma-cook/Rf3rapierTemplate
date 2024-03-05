import { useEffect, useRef } from 'react'
import { useCompoundBody } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'

const positions = [[-5, 1, -5]]

function Obstacle({ position }) {
  const [ref, api] = useCompoundBody(
    () => ({
      mass: 0,
      position: position,
      shapes: [{ args: [5, 5, 5], position: [1.75, 0, 0], type: 'Box' }]
    }),
    useRef()
  )

  useEffect(() => {
    //console.log('in useEffect')
    api.angularFactor.set(0, 1, 0) // causes the obstacles to remain upright in case of collision
  })

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[5, 5, 5]} />
      <meshStandardMaterial />
    </mesh>
  )
}

export default function Obstacles() {
  return (
    <>
      {positions.map((position, i) => (
        <Obstacle key={i} position={position} material={'ground'} />
      ))}
    </>
  )
}
