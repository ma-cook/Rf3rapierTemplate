import { Suspense, useMemo, useRef, useEffect } from 'react'
import { Vector3, Euler, Quaternion, Matrix4, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh } from 'three'
import Eve from './Eve'
import { useCompoundBody } from '@react-three/cannon'
import useKeyboard from './useKeyboard'
import { useFrame, useThree } from '@react-three/fiber'
import { Vec3 } from 'cannon-es'
import useFollowCam from './useFollowCam'
import { useStore } from './App'
import Torso from './Torso'
import * as THREE from 'three'
import { Object3D } from 'three'

export default function Player({ position }) {
  const playerGrounded = useRef(false)
  const inJumpAction = useRef(false)
  const group = useRef()
  const { yaw, pitch, secondGroup, updateMouseMovement } = useFollowCam(group, [0, 1, 1.5])
  const velocity = useMemo(() => new Vector3(), [])
  const inputVelocity = useMemo(() => new Vector3(), [])
  const euler = useMemo(() => new Euler(), [])
  const quat = useMemo(() => new Quaternion(), [])
  const targetQuaternion = useMemo(() => new Quaternion(), [])
  const worldPosition = useMemo(() => new Vector3(), [])
  const raycasterOffset = useMemo(() => new Vector3(), [])
  const contactNormal = useMemo(() => new Vec3(0, 0, 0), [])
  const down = useMemo(() => new Vec3(0, -1, 0), [])
  const rotationMatrix = useMemo(() => new Matrix4(), [])
  const prevActiveAction = useRef(0) // 0:idle, 1:walking, 2:jumping
  const keyboard = useKeyboard()
  const secondGroupPosition = useMemo(() => new Vector3(), [])
  const { groundObjects, actions, mixer, setTime, setFinished } = useStore((state) => state)
  const reticule = useRef() // Ref for the reticule mesh
  const raycaster = useMemo(() => new Raycaster(), [])

  const containerGroup = useRef()

  const { camera } = useThree()

  useEffect(() => {
    document.addEventListener('mousemove', updateMouseMovement)
    return () => {
      document.removeEventListener('mousemove', updateMouseMovement)
    }
  }, [updateMouseMovement])

  // Create the reticule mesh
  useEffect(() => {
    const geometry = new SphereGeometry(0.05, 16, 16)
    const material = new MeshBasicMaterial({ color: 0xff0000 })
    const mesh = new Mesh(geometry, material)
    reticule.current = mesh
    containerGroup.current.add(mesh) // Add the reticule to the group
    return () => {
      containerGroup.current.remove(mesh) // Remove the reticule when the component unmounts
    }
  }, [])

  useFrame(() => {
    // Update the raycaster based on the mouse position
    raycaster.setFromCamera({ x: 0, y: 0 }, camera)

    // Find intersections with objects in the scene
    const intersects = raycaster.intersectObjects(Object.values(groundObjects), false)

    if (intersects.length > 0) {
      // If there is an intersection, update the reticule's position
      const intersection = intersects[0]
      reticule.current.position.copy(intersection.point)
    }
  })

  const [ref, body] = useCompoundBody(
    () => ({
      mass: 1,
      shapes: [
        { args: [0.25], position: [0, 0.25, 0], type: 'Sphere' },
        { args: [0.25], position: [0, 0.75, 0], type: 'Sphere' },
        { args: [0.25], position: [0, 1.25, 0], type: 'Sphere' }
      ],
      onCollide: (e) => {
        if (e.contact.bi.id !== e.body.id) {
          contactNormal.set(...e.contact.ni)
        }
        if (contactNormal.dot(down) > 0.5) {
          if (inJumpAction.current) {
            // landed
            inJumpAction.current = false
            actions['jump']
          }
        }
      },
      material: 'slippery',
      linearDamping: 0,
      position: position
    }),
    useRef()
  )

  const updateSecondGroupQuaternion = () => {
    // Assuming yaw.rotation is the mouse movement data
    const gaze = new Quaternion()

    // Set pitch directly to euler.x
    const euler = new Euler(pitch.rotation.x, yaw.rotation.y, 0, 'YZX')

    // Convert euler angles to quaternion
    gaze.setFromEuler(euler)

    console.log(euler.x)
    secondGroup.current.setRotationFromQuaternion(gaze)
  }

  useFrame(({ raycaster }, delta) => {
    let activeAction = 0 // 0:idle, 1:walking, 2:jumping
    body.angularFactor.set(0, 0, 0)

    ref.current.getWorldPosition(worldPosition)

    playerGrounded.current = false
    raycasterOffset.copy(worldPosition)
    raycasterOffset.y += 0.01
    raycaster.set(raycasterOffset, down)
    raycaster.intersectObjects(Object.values(groundObjects), false).forEach((i) => {
      if (i.distance < 0.028) {
        playerGrounded.current = true
      }
    })
    if (!playerGrounded.current) {
      body.linearDamping.set(0) // in the air
    } else {
      body.linearDamping.set(0.9999999)
    }

    const distance = worldPosition.distanceTo(group.current.position)

    if (document.pointerLockElement) {
      updateSecondGroupQuaternion()
    }

    rotationMatrix.lookAt(worldPosition, group.current.position, group.current.up)

    targetQuaternion.setFromRotationMatrix(rotationMatrix)
    if (distance > 0.0001 && !group.current.quaternion.equals(targetQuaternion)) {
      targetQuaternion.z = 0
      targetQuaternion.x = 0
      targetQuaternion.normalize()
      group.current.quaternion.rotateTowards(targetQuaternion, delta * 6)
    }

    inputVelocity.set(0, 0, 0)
    if (playerGrounded.current) {
      // if grounded I can walk
      if (keyboard['KeyW']) {
        activeAction = 1
        inputVelocity.z = -40 * delta
      }
      if (keyboard['KeyS']) {
        activeAction = 1
        inputVelocity.z = 40 * delta
      }
      if (keyboard['KeyA']) {
        activeAction = 1
        inputVelocity.x = -40 * delta
      }
      if (keyboard['KeyD']) {
        activeAction = 1
        inputVelocity.x = 40 * delta
      }
      inputVelocity.setLength(0.7) // clamps walking speed

      if (activeAction !== prevActiveAction.current) {
        if (prevActiveAction.current !== 1 && activeAction === 1) {
          actions['walk']
          actions['idle']
        }
        if (prevActiveAction.current !== 0 && activeAction === 0) {
          actions['idle']
          actions['walk']
        }
        prevActiveAction.current = activeAction
      }

      if (keyboard['Space']) {
        if (playerGrounded.current && !inJumpAction.current) {
          activeAction = 2
          inJumpAction.current = true
          actions['jump']
          inputVelocity.y = 6
        }
      }

      euler.y = yaw.rotation.y
      euler.order = 'YZX'
      quat.setFromEuler(euler)
      inputVelocity.applyQuaternion(quat)
      velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)

      body.applyImpulse([velocity.x, velocity.y, velocity.z], [0, 0, 0])
    }

    if (activeAction === 1) {
      mixer.update(delta * distance * 22.5)
    } else {
      mixer.update(delta)
    }

    if (worldPosition.y < -3) {
      body.velocity.set(0, 0, 0)
      body.position.set(0, 1, 0)
      group.current.position.set(0, 1, 0)

      setFinished(false)
      setTime(0)
    }

    group.current.position.lerp(worldPosition, 0.9)
    secondGroup.current.position.lerp(worldPosition, 0.9)
  })

  return (
    <group ref={containerGroup} position={position}>
      {/* First Eve component */}
      <group ref={(groupRef) => (group.current = groupRef)} position={position}>
        <Suspense fallback={null}>
          <Eve />
        </Suspense>
      </group>

      {/* Second Eve component */}
      <group ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)} position={secondGroupPosition}>
        <Suspense fallback={null}>
          <Torso />
        </Suspense>
      </group>
    </group>
  )
}
