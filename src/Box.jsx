import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import { useStore } from './App'
import { useBox } from '@react-three/cannon'

export default function Box() {
  const ref = useRef()
  const [boxRef, api] = useBox(() => ({ mass: 0, position: [15, 0, 0] }))
  return (
    <>
      <group ref={ref}>
        <mesh castShadow receiveShadow position={[15, 0, 0]} ref={boxRef}>
          <meshStandardMaterial color="white" />
          <boxGeometry args={[10, 10, 10]} />
        </mesh>
      </group>
    </>
  )
}
