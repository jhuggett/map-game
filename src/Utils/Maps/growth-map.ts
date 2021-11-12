import { Coor } from "../Coordinate"
import { shuffle, getRandomBool, getRandomNumber } from "../Randomization"




export enum LandType {
  land, scaffold, coast, mountain
}

export class GrowthPointData {
  coor: Coor
  landType: LandType

  constructor(coor: Coor, landType: LandType) {
      this.coor = coor
      this.landType = landType
  }
}

export class GrowthMap {
  points: Array<GrowthPointData> = []

  growthPoints: Array<Coor> = [new Coor(0, 0)]

  removePoint(coor: Coor) {
      this.points = this.points.filter( point =>  point.coor.sameAs(coor))
  }

  addPoint(point: GrowthPointData) {
      this.points.push(point)
  }

  checkForPoint(coor: Coor) : GrowthPointData {
      return this.points.filter( point => point.coor.sameAs(coor) )[0] || null
  }

  grow(type: LandType, chance: number, callback?: (point: GrowthPointData) => void) : Array<Coor> {
      var newGrowth: Array<Coor> = []

      this.growthPoints.forEach( point => {
          const adjacentPoints = point.getAdjacentCoors()
          shuffle(adjacentPoints).forEach( adjacentPoint => {
              if (!this.checkForPoint(adjacentPoint)) {
                  if (newGrowth.length == 0 || getRandomBool(chance)) {
                      const point = new GrowthPointData(adjacentPoint, type)
                      this.addPoint(point)
                      if (callback) callback(point)
                      newGrowth.push(adjacentPoint)
                  }
              }
          } )
      })

      this.growthPoints = newGrowth

      return newGrowth
  }

  growToSize(size: number, callback?: (point: GrowthPointData) => void) {
      var count = 0
      while (count < size) {
          
          for ( let i = getRandomNumber(25, 100); i--; ) {
              if (count >= size) {
                  break
              }
              const growth = this.grow(LandType.land, 0.5, callback).length
              if (growth == 0) {
                  return
              }
              count += growth
          }

          for ( let i = getRandomNumber(25, 100); i--; ) {
              if (count >= size) {
                  break
              }
              this.grow(LandType.scaffold, 0.5)
          }
      }
  }
}