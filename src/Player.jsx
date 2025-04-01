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

  const previousPosition = useRef(new Vector3())
  const smoothedPosition = useRef(new Vector3())
  const lerpFactor = 0.2 // Adjust this value between 0.05-0.3 for smoother transitions

  const jumpCooldown = useRef(false)
  const jumpForce = 15

  const jump = () => {
    if (!jumpCooldown.current && api.current) {
      api.current.applyImpulse({ x: 0, y: jumpForce, z: 0 })
      jumpCooldown.current = true
      setTimeout(() => {
        jumpCooldown.current = false
      }, 500)
    }
  }

  useFrame(({ raycaster }, delta) => {
    const speed = 0.8
    const direction = new Vector3()

    // Get the forward direction of the secondGroup
    secondGroup.current.getWorldDirection(direction)
    const rightDirection = new Vector3().crossVectors(new Vector3(0, 1, 0), direction)

    // Handle movement with improved velocity management
    if (api.current) {
      const currentVel = api.current.linvel()

      // Only reset velocity if no movement keys are pressed
      if (!keyboard['KeyW'] && !keyboard['KeyS'] && !keyboard['KeyA'] && !keyboard['KeyD']) {
        api.current.setLinvel({
          x: Math.abs(currentVel.x) < 0.1 ? 0 : currentVel.x * 0.95,
          y: currentVel.y,
          z: Math.abs(currentVel.z) < 0.1 ? 0 : currentVel.z * 0.95
        })
      }

      // Apply movement forces
      if (keyboard['KeyW']) {
        api.current.applyImpulse({ x: -direction.x * speed, y: 0, z: -direction.z * speed })
      }
      if (keyboard['KeyS']) {
        api.current.applyImpulse({ x: direction.x * speed, y: 0, z: direction.z * speed })
      }
      if (keyboard['KeyA']) {
        api.current.applyImpulse({ x: -rightDirection.x * speed, y: 0, z: -rightDirection.z * speed })
      }
      if (keyboard['KeyD']) {
        api.current.applyImpulse({ x: rightDirection.x * speed, y: 0, z: rightDirection.z * speed })
      }
      if (keyboard['Space']) {
        jump()
      }
    }

    // Update position synchronization without smoothing
    if (group.current && secondGroup.current) {
      const currentPosition = new THREE.Vector3()
      group.current.getWorldPosition(currentPosition)

      // Add vertical offset for torso position
      currentPosition.y += 0.5 // Sphere radius

      // Direct position copy without lerp
      secondGroup.current.position.copy(currentPosition)

      // Keep rotation smoothing
      updateSecondGroupQuaternion()
    }

    updatePlayerPosition(delta)
    handleLasersCallback(delta)
  })

  return (
    <group ref={containerGroup} position={position}>
      <RigidBody
        ref={api}
        position={[0, 0.5, 0]}
        friction={0.2}
        restitution={0}
        colliders="cuboid"
        mass={10.0}
        linearDamping={0.8} // Adjusted damping
        angularDamping={4}
        lockRotations={true}
        type="dynamic">
        {/* First Eve component */}
        <group ref={(groupRef) => (group.current = groupRef)}>
          <Suspense fallback={null}>
            <Eve />
          </Suspense>
        </group>
      </RigidBody>

      {/* Update secondGroup to follow with smoothing */}
      <group
        ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)}
        position={[0, 0, 0]} // Reset initial position
      >
        <Suspense fallback={null}>
          <Torso />
        </Suspense>
      </group>
      <group ref={laserGroup}></group>
    </group>
  )
})

export default Player
