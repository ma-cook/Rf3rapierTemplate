import React from 'react'
import { Debug, useContactMaterial } from '@react-three/cannon'
import Floor from './Floor'
import Obstacles from './Obstacles'
import Player from './Player'
import { useControls } from 'leva'
import Box from './Box'

const Game = React.memo(function Game() {
  return (
    <>
      <Floor />

      <Player />
    </>
  )
})

export default Game
