#!/usr/bin/env node

import { TerminalInterface, TerminalInteractor, TerminalRenderer } from "./Terminal/terminal-interface"
import { Coor } from "./Utils/Coordinate"
import { GrowthMap, GrowthPointData, Landmass, LandmassPoint } from "./Utils/Maps/growth-map"
import { range } from "./Utils/Coordinate/misc"
import { KDTree, KDTreeInput } from "./Utils/KDTree"

const renderMap = async (interactor: TerminalInteractor , map: KDTree<LandmassPoint>, offset) => {
  const { coloring, cursor } = interactor

  const xOffset = offset.x
  const yOffset = offset.y

  interactor.resetCursor()

  let numberOfWrites = 0
  
  for (let y = interactor.start.y; y < interactor.end.y; y++) {

    for (let x = interactor.start.x; x + 2 <= (interactor.end.x); x += 2) {
      //console.log({x, y, xOffset, yOffset, start: interactor.start, end: interactor.end});
      
      const point = new Coor(Math.floor((x - 1) / 2) + xOffset, y + yOffset)

      const land = map.find(point.asArray())

      if (land) {
        const content = interactor.coloring.bg256(' ', 76)

        interactor.write(content).write(content)
      } else {
        const content = interactor.coloring.bg256(' ', 25)

        interactor.write(content).write(content)
      }

      numberOfWrites += 2

    }
    if (interactor.width()  % 2) {
      interactor.write(' ')
      numberOfWrites += 1
    }

  }

  //console.log(interactor.pixels.all().map(i => i.value.content).join(''));
  

  return

  range(interactor.start.y, interactor.end.y - 1).forEach(y => {
    console.log({
      y
    });
    
    range(interactor.start.x, Math.floor((interactor.end.x) / 2 - 1)).forEach(x => {
      console.log({x});
      
      const land = map.find([x + xOffset, y + yOffset])?.value
      // if (land?.partOfCoastalRing && land.partOfCoastalRing.isBeach) {
      //   rendering += coloring.bg256(`${land.distanceToWater}`.length > 1 ? `${land.distanceToWater}` : `${land.distanceToWater}-`, land.partOfCoastalRing.color)
      // } else if (land?.partOfCoastalRing) {
      //   rendering += coloring.bg256(`${land.distanceToWater}`.length > 1 ? `${land.distanceToWater}` : `${land.distanceToWater}-`, land.partOfCoastalRing.color)
      // } else if (land) {
      //   rendering += coloring.bg256(`${land.distanceToWater}`.length > 1 ? `${land.distanceToWater}` : `${land.distanceToWater}-`, land.landmass.color)
      // } else {
      //   rendering += coloring.bg256('  ', 17)
      // }

      if (land) {
        console.log('land');
        
        interactor.write(coloring.bg256(' ', land.landmass.color))
        interactor.write(coloring.bg256(' ', land.landmass.color))
      } else {
        console.log('no land');
        
        interactor.write(coloring.bg256(' ', 17))
        interactor.write(coloring.bg256(' ', 17))
      }
    })
    if (interactor.end.x % 2) {
      console.log('nada');
      
      interactor.write(' ')
      interactor.write(' ')
    }
  })
  //interactor.write(rendering)
}

/*
TODOs:
  - Elevation
  - Mountains
  - Land Selector Ui
  - Start a town
*/

const mapInteraction = async () => {
  const growthMap = new GrowthMap()

  console.log("growing...");
  
  growthMap.growToSize(10000)

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

  console.log('calculating distance to water...');
  
  landmasses.forEach(landmass => landmass.distanceToWater())
  
  console.log('building render tree...');
  

  const allPoints = landmasses.map(landmass => {
    return landmass.points.all()
  })

  const flattenedAllPoints: KDTreeInput<LandmassPoint>[] = [].concat.apply([], allPoints)

  const fullTree = new KDTree(
    flattenedAllPoints
  )

  const termRenderer = new TerminalRenderer()

  const width = termRenderer.width()
  const height = termRenderer.height()

  // const term = new TerminalInteractor({
  //   start: new Coor(40, 40),
  //   end: new Coor(termRenderer.width(), termRenderer.height())
  // })

  const middle = {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2)
  }

  const viewWidth = width * .75
  const viewHeight = height * .75

  const halfViewWidth = Math.floor(viewWidth / 2)
  const halfViewHeight = Math.floor(viewHeight / 2)


  const term = new TerminalInteractor({
    start: new Coor(middle.x - halfViewWidth, middle.y - halfViewHeight),
    end: new Coor(middle.x + halfViewWidth, middle.y + halfViewHeight)
  })


  termRenderer.pushInteractor(term)

  let offset = {
    x: 0, 
    y: 0
  }

  while (true) {
    
    renderMap(term, fullTree, offset)

    termRenderer.render()

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

  const termRenderer = new TerminalRenderer()

  termRenderer.hideCaret()
  termRenderer.setRawMode(true)
  
  const term = TerminalInterface.interactor
  
  term.clearScreen()
  
  await mapInteraction()

})()

process.on("exit", () => {
  const termRenderer = new TerminalRenderer()

  termRenderer.showCaret()
  termRenderer.setRawMode(false)
  termRenderer.clearScreen()

  console.log("Goodbye");
  
})