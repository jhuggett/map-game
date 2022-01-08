#!/usr/bin/env node

import { TerminalInterface } from "./Terminal"
import { Coor } from "./Utils/Coordinate"
import { GrowthMap, GrowthPointData, Landmass, LandmassPoint, LandType } from "./Utils/Maps/growth-map"
import { range, Direction } from "./Utils/Coordinate/misc"
import { KDTree, KDTreeInput } from "./Utils/KDTree"
import { TerminalInteractor } from "./Terminal/interactor"
import { TerminalRenderer } from "./Terminal/renderer"
import { Size } from "./Utils/Size/2d"

// │
// ┤
// ┐
// └
// ┴
// ┬
// ├
// ─
// ┼
// ┌
// ┘
// 
// 
// 
// ▒▒
// 

//  ┬┐
//  ┼┤
//


const pipe = {
  horizontal: '─',
  vertical: '│',
  topAndRight: '└',
  topAndLeft: '┘',
  bottomAndRight: '┌',
  bottomAndLeft: '┐',
  topRightAndLeft: '┴',
  topRightAndBottom: '├',
  topBottomAndLeft: '┤',
  rightBottomAndLeft: '┬',
  topRightBottomAndLeft: '┼'
}

// top right bottom left
// x x o o

function getRiverRenderer(symbols: any = pipe) {
  const renderer: { [key: string]: string; } = {}

  function add(key: string, value: string) {
    renderer[key] = value
  }

  add('xoxo', `${symbols.vertical} `)
  add('xxoo', `${symbols.topAndRight}${symbols.horizontal}`)
  add('xoox', `${symbols.topAndLeft} `)
  add('oxxo', `${symbols.bottomAndRight}${symbols.horizontal}`)
  add('ooxx', `${symbols.bottomAndLeft} `)
  add('oxox', `${symbols.horizontal}${symbols.horizontal}`)
  add('xxxx', `${symbols.topRightBottomAndLeft}${symbols.horizontal}`)
  add('xxxo', `${symbols.topRightAndBottom}${symbols.horizontal}`)
  add('oxxx', `${symbols.rightBottomAndLeft}${symbols.horizontal}`)
  add('xxox', `${symbols.topRightAndLeft}${symbols.horizontal}`)
  add('xoxx', `${symbols.topBottomAndLeft} `)
  
  return renderer
}



const renderMap = async (interactor: TerminalInteractor , map: KDTree<LandmassPoint>, offset) => {
  const { coloring, cursor } = interactor

  const xOffset = offset.x
  const yOffset = offset.y

  const riverRenderer = getRiverRenderer()

  interactor.resetCursor()



  let numberOfWrites = 0
  
  for (let y = interactor.start().y; y < interactor.end().y; y++) {

    for (let x = interactor.start().x; x + 2 <= (interactor.end().x); x += 2) {
      //console.log({x, y, xOffset, yOffset, start: interactor.start, end: interactor.end});

      let item = '  '
      
      const point = new Coor(Math.floor((x - 1) / 2) + xOffset, y + yOffset)

      const land: LandmassPoint = map.find(point.asArray())?.value

      

      if (land) {
        const e = land.distanceToWater

        // if (e < 10 && e > 0) {
        //   item = interactor.coloring.fg256(` ${e}`, 250)
        // } else if (e > 0) {
        //   item = interactor.coloring.fg256(e.toString().slice(0, 2), 250)
        // } else {
        //   item = interactor.coloring.fg256(`  `, 22)
        // }

        
      }

      if (land && land.river) {

        item = interactor.coloring.fg256('≡≡', 25)
        
        const link = land.river.linkedPoints.filter(i => i.value.coor.sameAs(land.coor))[0]

        const previousCoor = link.previous?.value?.coor
        const currentCoor = link.value.coor
        const nextCoor = link.next?.value?.coor
        

        let choice = ''
        choice += currentCoor.north().sameAs(previousCoor) || currentCoor.north().sameAs(nextCoor) || map.find(currentCoor.north().asArray())?.value?.river?.linkedPoints.slice(-1)[0]?.next?.value?.coor?.sameAs(currentCoor) ? 'x' : 'o'
        choice += currentCoor.east().sameAs(previousCoor) || currentCoor.east().sameAs(nextCoor) || !!map.find(currentCoor.east().asArray())?.value?.river?.linkedPoints.slice(-1)[0]?.next?.value?.coor?.sameAs(currentCoor) ? 'x' : 'o'
        choice += currentCoor.south().sameAs(previousCoor) || currentCoor.south().sameAs(nextCoor) || !!map.find(currentCoor.south().asArray())?.value?.river?.linkedPoints.slice(-1)[0]?.next?.value?.coor?.sameAs(currentCoor) ? 'x' : 'o'
        choice += currentCoor.west().sameAs(previousCoor) || currentCoor. west().sameAs(nextCoor) || !!map.find(currentCoor.west().asArray())?.value?.river?.linkedPoints.slice(-1)[0]?.next?.value?.coor?.sameAs(currentCoor) ? 'x' : 'o'

        item = interactor.coloring.fg256(riverRenderer[choice] || (choice == '' && 'oo' || 'xx'), 25)
      } 

      if (land && land.landType == LandType.land) {
        const content = interactor.coloring.bg256(item, 76)
        interactor.write(content).write('')
      } else if (land && land.landType == LandType.coast) {
        const content = interactor.coloring.bg256(item, 76) // 221
        interactor.write(content).write('')
      } else if (land && land.landType == LandType.mountain) {
        const content = interactor.coloring.bg256(item, 251)
        interactor.write(content).write('')
      } else if (land && land.landType == LandType.snowcapped) {
        const content = interactor.coloring.bg256(item, 231)
        interactor.write(content).write('')
      } else {
        const content = interactor.coloring.bg256(item, 25)

        interactor.write(content).write('')
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

  range(interactor.start().y, interactor.end().y - 1).forEach(y => {
    console.log({
      y
    });
    
    range(interactor.start().x, Math.floor((interactor.end().x) / 2 - 1)).forEach(x => {
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
    if (interactor.end().x % 2) {
      console.log('nada');
      
      interactor.write(' ')
      interactor.write(' ')
    }
  })
  //interactor.write(rendering)
}

/*
TODOs:
  - Land Selector Ui
  - Start a town
*/


function termVerticalCenter(term: TerminalRenderer) {
  return Math.floor(term.height() / 2)
}

function termHorizontalCenter(term: TerminalRenderer) {
  return Math.floor(term.width() / 2)
}

function termCenter(term: TerminalRenderer) {
  return new Coor(termHorizontalCenter(term), termVerticalCenter(term))
}

function createInteraction(at: Coor, size: Size, term: TerminalRenderer) {
  return new TerminalInteractor({
    start: () => {
      return new Coor(
        at.x,
        at.y
      )
    },
    end: () => {
      return new Coor(
        at.x + Math.floor(size.width * term.width()),
        at.y + Math.floor(size.height * term.height())
      )
    }
  })
}


const mapInteraction = async () => {
  const growthMap = new GrowthMap()

  const termRenderer = new TerminalRenderer()

  // const width = termRenderer.width()
  // const height = termRenderer.height()

  // const middle = {
  //   x: Math.floor(width / 2),
  //   y: Math.floor(height / 2)
  // }

  // const viewWidth = width * .9
  // const viewHeight = height * .9

  // const halfViewWidth = Math.floor(viewWidth / 2)
  // const halfViewHeight = Math.floor(viewHeight / 2)


  // const term = new TerminalInteractor({
  //   start: () => new Coor(middle.x - halfViewWidth, middle.y - halfViewHeight),
  //   end: () => new Coor(middle.x + halfViewWidth, middle.y + halfViewHeight)
  // })

  const mapInteractor = createInteraction(
    new Coor(0, 0),
    new Size(.5, .5),
    termRenderer
  )

  //term.border = doublePipeBorder()

  const write = (text: string) => {
    mapInteractor.write(text)
    mapInteractor.return()
    termRenderer.render()
  }

  termRenderer.pushInteractor(mapInteractor)

  write("growing...")
  
  growthMap.growToSize(10000)

  write("pruning scaffolding...")
  
  growthMap.pruneScaffolding()

  write("loading tree...")
  
  growthMap.loadTree()

  write("identifying landmasses...")
  
  const landmasses = growthMap.identifyLandmasses()

  write("finding costal points")

  landmasses.forEach(landmass => landmass.getCostalPoints())

  write("softening...")
  
  landmasses.forEach(landmass => landmass.soften())

  write("finding coastal rings...")

  landmasses.forEach(landmass => landmass.getCoastalRings())

  write("calculating distance to water...")
  
  landmasses.forEach(landmass => landmass.distanceToWater())

  write("growing mountains...")

  landmasses.forEach(landmass => landmass.growMountains())

  write("finding distance to mountains...")

  landmasses.forEach(landmass => landmass.findDistanceToMountains())

  write("calculating elevation...")

  landmasses.forEach(landmass => landmass.calculateElevation())

  write("laying rivers...")

  landmasses.forEach(landmass => landmass.generateRivers())
  
  write("building render tree...")
  

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
    
    renderMap(mapInteractor, fullTree, offset)

    termRenderer.render()

    const key = await mapInteractor.reactToKeyPress()

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