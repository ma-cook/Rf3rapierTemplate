import * as THREE from 'three'
const laserGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5)
const laserMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }) // Set color to blue
let lastFired = Date.now()
const fireRate = 700 // Fire rate in milliseconds

export const shootLasers = (secondGroup, laserGroup, lasers) => {
  const now = Date.now()
  if (now - lastFired < fireRate) {
    return // If not enough time has passed since the last shot, don't fire
  }
  lastFired = now

  // Create lasers and set their positions
  const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial)
  laserMesh.position.set(secondGroup.current.position.x, secondGroup.current.position.y + 1, secondGroup.current.position.z)
  laserMesh.quaternion.copy(secondGroup.current.quaternion)
  const light = new THREE.PointLight(0xffffff, 10, 500)
  light.position.set(0, 0, 0)
  laserMesh.add(light)
  // Add the lasers to the scene
  laserGroup.current.add(laserMesh)

  // Add the lasers to the state for later reference
  lasers.push(laserMesh)
}
