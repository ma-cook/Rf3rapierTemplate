import { RigidBody } from '@react-three/rapier' // Component for rigid body physics simulation
import * as THREE from 'three' // Three.js library

// Function to convert an angle from degrees to radians
const angleToRadians = (angleInDeg) => (Math.PI / 180) * angleInDeg

// Array of data defining the positions and rotations of walls
const data = [
  {
    position: [0, 0, -20],
    rotation: [0, 0, 0]
  }
]

// Walls component - creates walls and grounds using RigidBody components
export default function Floor() {
  return (
    <RigidBody type="Static">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={data[0].position}>
        <planeGeometry args={[1000, 1000]} />
        <meshNormalMaterial />
      </mesh>
    </RigidBody>
  )
}
