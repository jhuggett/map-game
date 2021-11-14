#!/usr/bin/env node

import { TerminalInterface, TerminalInteractor } from "./Terminal/terminal-interface"
import { Coor } from "./Utils/Coordinate"
import { GrowthMap, GrowthPointData, Landmass, LandmassPoint } from "./Utils/Maps/growth-map"
import { range } from "./Utils/Coordinate/misc"
import { KDTree, KDTreeInput } from "./Utils/KDTree"

const renderMap = async (interactor: TerminalInteractor , map: KDTree<LandmassPoint>, offset) => {
  const { coloring, cursor } = interactor

  let rendering = ''

  const xOffset = offset.x
  const yOffset = offset.y

  range(interactor.start.y, interactor.end.y - 1).forEach(y => {

    if (rendering != '') rendering += '\n'
    range(interactor.start.x, Math.floor((interactor.end.x) / 2 - 1)).forEach(x => {
      const land = map.find([x + xOffset, y + yOffset])?.value
      if (land?.partOfCoastalRing && land.partOfCoastalRing.isBeach) {
        rendering += coloring.bg256('[]', land.partOfCoastalRing.color)
      } else if (land?.partOfCoastalRing) {
        rendering += coloring.bg256('  ', land.partOfCoastalRing.color)
      } else if (land) {
        rendering += coloring.bg256(coloring.fg256('  ', land.landmass.color), land.landmass.color)
      } else {
        rendering += coloring.bg256('  ', 17)
      }
    })
    if (interactor.end.x % 2) rendering += ' '
  })
  interactor.write(rendering)
}

const mapInteraction = async (term: TerminalInteractor) => {
  const { cursor } = term
  const growthMap = new GrowthMap()

  console.log("growing...");
  
  growthMap.growToSize(25000)

  console.log('pruning scaffolding...');
  
  growthMap.pruneScaffolding()

  console.log('loading tree...');
  
  growthMap.loadTree()

  console.log('identifying landmasses...');
  
  const landmasses = growthMap.identifyLandmasses()

  console.log('finding coastal points...');

  landmasses.forEach(landmass => landmass.getCostalPoints())

  console.log('softening...');
  
  landmasses.forEach(landmass => landmass.soften())

  console.log('finding coastal rings...');

  landmasses.forEach(landmass => landmass.getCoastalRings())
  
  console.log('building render tree...');
  

  const allPoints = landmasses.map(landmass => {
    return landmass.points.all()
  })

  const flattenedAllPoints: KDTreeInput<LandmassPoint>[] = [].concat.apply([], allPoints)

  const fullTree = new KDTree(
    flattenedAllPoints
  )


  

  let offset = {
    x: 0, 
    y: 0
  }

  while (true) {
    cursor.move.to(new Coor(0, 0))
    
    renderMap(term, fullTree, offset)

    const key = await term.reactToKeyPress()

    if (key[0] == 3) {
      process.exit()
    }

    const moveAmount = 5

    if (key[0] == 27 && key[1] == 91 && key[2] == 65) {
      // up
      offset.y -= moveAmount
    }
    if (key[0] == 27 && key[1] == 91 && key[2] == 66) {
      // down
      offset.y += moveAmount
    }
    if (key[0] == 27 && key[1] == 91 && key[2] == 67) {
      // right
      offset.x += moveAmount
    }
    if (key[0] == 27 && key[1] == 91 && key[2] == 68) {
      // left
      offset.x -= moveAmount
    }

  }
}

(async () => {
  
  const term = TerminalInterface.interactor
  


  term.clearScreen()
  
  

  await mapInteraction(term)

  

})()