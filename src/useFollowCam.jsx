import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Object3D, Vector3 } from 'three'

export default function useFollowCam(secondGroup, offset, api) {
  const { scene, camera } = useThree()
  const pivot = useMemo(() => new Object3D(), [])
  const alt = useMemo(() => new Object3D(), [])
  const yaw = useMemo(() => new Object3D(), [])
  const pitch = useMemo(() => new Object3D(), [])
  const worldPosition = useMemo(() => new Vector3(), [])
  const smoothedPosition = useRef(new Vector3())
  const lerpFactor = 0.15 // Camera position smoothing factor

  const MIN_PITCH = -75 * (Math.PI / 180)
  const MAX_PITCH = 50 * (Math.PI / 180)

  function onDocumentMouseMove(e) {
    if (document.pointerLockElement) {
      e.preventDefault()
      yaw.rotation.y -= e.movementX * 0.002
      const v = pitch.rotation.x - e.movementY * 0.002
      if (v > MIN_PITCH && v < MAX_PITCH) {
        pitch.rotation.x = v
      }
    }
  }

  function onDocumentMouseWheel(e) {
    if (document.pointerLockElement) {
      e.preventDefault()
      const v = camera.position.z + e.deltaY * 0.005
      if (v >= 0.5 && v <= 5) {
        camera.position.z = v
      }
    }
  }

  useEffect(() => {
    scene.add(pivot)
    pivot.add(alt)
    alt.position.y = offset[2.0]
    alt.add(yaw)
    yaw.add(pitch)
    pitch.add(camera)
    camera.position.set(offset[0], offset[1], offset[2] + 5)

    alt.add(secondGroup)
    console.log(secondGroup)

    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mousewheel', onDocumentMouseWheel, { passive: false })
    return () => {
      document.removeEventListener('mousemove', onDocumentMouseMove)
      document.removeEventListener('mousewheel', onDocumentMouseWheel)
    }
  }, [camera])

  useFrame(() => {
    if (secondGroup.current) {
      secondGroup.current.getWorldPosition(worldPosition)

      // Smoothly interpolate the pivot position to reduce jittering
      smoothedPosition.current.lerp(worldPosition, lerpFactor)
      pivot.position.copy(smoothedPosition.current)
    }
  })

  return { pivot, alt, yaw, pitch, secondGroup }
}
