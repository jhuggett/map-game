import { Direction, range } from "./misc"


export class Coor {
  constructor(public x: number, public y: number) {}


  sameAs(coor: Coor) : boolean {
    if (this.x == coor.x && this.y == coor.y) {
        return true
    }
    return false
  }


  getAdjacentCoors(coor: Coor = this) : Array<Coor> {
    return [
        new Coor(coor.x + 1, coor.y),
        new Coor(coor.x - 1, coor.y),
        new Coor(coor.x, coor.y + 1),
        new Coor(coor.x, coor.y - 1)
    ]
  }

  getDisplacedCoor(direction: Direction, coor: Coor = this) : Coor {
    switch (direction) {
        case Direction.north: {
            return new Coor(coor.x, coor.y - 1)
        }
        case Direction.south: {
            return new Coor(coor.x, coor.y + 1)
        }
        case Direction.east: {
            return new Coor(coor.x + 1, coor.y)
        }
        case Direction.west: {
            return new Coor(coor.x - 1, coor.y)
        } 
    }
  }

  ring(distance: number, point: Coor = this) : Array<Coor> {
    const xRange = range(point.x - distance, point.x + distance)
    const yRange = range(point.y - distance, point.y + distance)
    return [
        ...xRange.map( x => new Coor(x, point.y - 1)),
        ...xRange.map( x => new Coor(x, point.y + 1)),
        ...yRange.map( y => new Coor(point.x - 1, y)),
        ...yRange.map( y => new Coor(point.x + 1, y))
    ] 
  }

  scan(point: Coor = this, distance: number) : Array<Coor> {
    const xRange = range(point.x - distance, point.x + distance)
    const yRange = range(point.y - distance, point.y + distance)
    return xRange.map( (x, i) => new Coor(x, yRange[i]) )
  }

  asArray() {
    return [this.x, this.y]
  }

  toString() {
    return `(x:${this.x}, y: ${this.y})`
  }

  static fromString(str: string) : Coor {
    return new Coor(
      +str.split(',')[0].split(':')[1],
      +str.split(',')[1].split(':')[1].slice(0, -1)
    )
  }
}