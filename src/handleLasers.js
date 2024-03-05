import { useCallback } from 'react'
import { shootLasers } from './shootLasers'

export const handleLasers = (isRightMouseDown, lasers, camera, secondGroup, laserGroup, laserDirection) => {
  return useCallback(
    (delta) => {
      lasers.forEach((laser) => {
        laserDirection.set(0, 0, -1).applyQuaternion(laser.quaternion)
        laser.position.add(laserDirection.clone().multiplyScalar(300 * delta))

        if (laser.position.distanceTo(secondGroup.current.position) > 100) {
          laserGroup.current.remove(laser)
          lasers.splice(lasers.indexOf(laser), 1)
        }
      })

      if (isRightMouseDown) {
        shootLasers(secondGroup, laserGroup, lasers, camera)
      }
    },
    [isRightMouseDown, lasers, camera, secondGroup, laserGroup, laserDirection]
  )
}
