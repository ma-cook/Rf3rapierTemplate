import React, { useCallback, Suspense, useMemo, useRef, useEffect, useState } from 'react'
import { Vector3, Euler, Quaternion, Matrix4, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh } from 'three'
import Eve from './Eve'
import useKeyboard from './useKeyboard'
import { useFrame, useThree } from '@react-three/fiber'
import useFollowCam from './useFollowCam'
import { useStore } from './App'
import Torso from './Torso'
import * as THREE from 'three'
import { Object3D } from 'three'
import { shootLasers } from './shootLasers'
import { createReticule, handleIntersections } from './Reticule'
import { handleLasers } from './handleLasers'
import { RigidBody } from '@react-three/rapier'

const Player = React.memo(function Player() {
  const keyboard = useKeyboard()
  const secondGroup = useMemo(() => new Object3D(), [])
  const api = useRef(null)
  const position = [0, 1, 0]
  const playerGrounded = useRef(false)
  const inJumpAction = useRef(false)
  const group = useRef()
  const { yaw, pitch, updateMouseMovement } = useFollowCam(secondGroup, [0, 1, 1.5], api)
  const velocity = useMemo(() => new Vector3(), [])
  const inputVelocity = useMemo(() => new Vector3(), [])
  const euler = useMemo(() => new Euler(), [])
  const quat = useMemo(() => new Quaternion(), [])
  const targetQuaternion = useMemo(() => new Quaternion(), [])
  const worldPosition = useMemo(() => new Vector3(), [])
  const raycasterOffset = useMemo(() => new Vector3(), [])

  const rotationMatrix = useMemo(() => new Matrix4(), [])
  const laserDirection = useMemo(() => new Vector3(), [])

  const secondGroupPosition = useMemo(() => new Vector3(), [])
  const { groundObjects, mixer, setTime, setFinished } = useStore((state) => state)
  const reticule = useRef() // Ref for the reticule mesh
  const raycaster = useMemo(() => new Raycaster(), [])
  const defaultPosition = new Vector3(0, 0, -50)
  const lasers = useStore((state) => state.lasers)
  const laserGroup = useRef()

  const [isRightMouseDown, setRightMouseDown] = useState(false)
  const handleLasersCallback = handleLasers(isRightMouseDown, lasers, camera, secondGroup, laserGroup, laserDirection)
  let cancelFrame = null

  const handleMouseDown = (event) => {
    if (event.button === 2) {
      setRightMouseDown((isRightMouseDown) => !isRightMouseDown)
    }
  }

  const handleMouseUp = (event) => {
    if (event.button === 2) {
      setRightMouseDown((isRightMouseDown) => !isRightMouseDown)
    }
  }

  const containerGroup = useRef()

  const { camera } = useThree()

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const updateSecondGroupQuaternion = () => {
    // Assuming yaw.rotation is the mouse movement data
    const gaze = new Quaternion()

    // Set pitch directly to euler.x
    const euler = new Euler(pitch.rotation.x, yaw.rotation.y, 0, 'YZX')

    // Convert euler angles to quaternion
    gaze.setFromEuler(euler)

    secondGroup.current.setRotationFromQuaternion(gaze)
  }
  const updatePlayerPosition = (delta) => {
    if (document.pointerLockElement) {
      updateSecondGroupQuaternion()
    }
    targetQuaternion.setFromRotationMatrix(rotationMatrix)
  }

  useFrame(({ raycaster }, delta) => {
    const speed = 0.8 // Adjust as needed
    const direction = new Vector3()

    // Get the forward direction of the secondGroup
    secondGroup.current.getWorldDirection(direction)

    // Reverse the direction for the 's' key
    // Get the right direction for the 'd' and 'a' keys
    const rightDirection = new Vector3().crossVectors(new Vector3(0, 1, 0), direction)

    if (keyboard['KeyW']) {
      // Move forward
      api.current.applyImpulse({ x: -direction.x * speed, y: -direction.y * speed, z: -direction.z * speed }, 'center')
    }
    if (keyboard['KeyS']) {
      // Move backward
      api.current.applyImpulse({ x: direction.x * speed, y: direction.y * speed, z: direction.z * speed }, true)
    }
    if (keyboard['KeyA']) {
      // Move left
      api.current.applyImpulse({ x: -rightDirection.x * speed, y: -rightDirection.y * speed, z: -rightDirection.z * speed }, 'center')
    }
    if (keyboard['KeyD']) {
      // Move right
      api.current.applyImpulse({ x: rightDirection.x * speed, y: rightDirection.y * speed, z: rightDirection.z * speed }, 'center')
    }
    if (group.current && secondGroup.current) {
      const position = new THREE.Vector3()
      group.current.getWorldPosition(position)
      secondGroup.current.position.copy(position)
    }

    updatePlayerPosition(delta)

    handleLasersCallback(delta)
  })

  return (
    <group ref={containerGroup} position={position}>
      <RigidBody
        ref={api}
        position={[0, 0, 0]}
        friction={8}
        restitution={0.00001}
        colliders="hull" // Change this to "sphere"
        mass={10.0}
        angularFactor={[0, 0, 0]} // Set to [0, 1, 0]
        angularDamping={1}>
        {/* First Eve component */}
        <group ref={(groupRef) => (group.current = groupRef)}>
          <Suspense fallback={null}>
            <Eve />
          </Suspense>
        </group>
        {/* Second Eve component */}
      </RigidBody>
      <group ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)}>
        <Suspense fallback={null}>
          <Torso />
        </Suspense>
      </group>
      <group ref={laserGroup}></group>
    </group>
  )
})

export default Player
