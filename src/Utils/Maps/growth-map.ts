import { Coor } from "../Coordinate"
import { shuffle, getRandomBool, getRandomNumber } from "../Randomization"
import { KDTree, KDTreeInput } from "../KDTree"

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

  tree: KDTree<GrowthPointData> = new KDTree([])

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

  pruneScaffolding() {
    this.points = this.points.filter(point => point.landType != LandType.scaffold)
  }

  

  loadTree() {
    this.tree = new KDTree(
      this.points.map(i => ({
        point: [i.coor.x, i.coor.y],
        value: i
      }))
    )
  }


  identifyLandmasses() {
    let landmasses: Landmass[] = []

    let allGatheredPoints: Set<string> = new Set()

    this.tree.all().forEach(({ value : point }) => {
      if (allGatheredPoints.has(point.coor.toString())) {
        return
      }

      let gatheredPoints: Set<string> = new Set<string>()

      let pointsToCheck: Set<string> = new Set<string>()
      let nextPointsToCheck: Set<string> = new Set<string>()

      pointsToCheck.add(point.coor.toString())

      while (pointsToCheck.size > 0) {
        pointsToCheck.forEach(pointToCheck => {

          gatheredPoints.add(pointToCheck)
          allGatheredPoints.add(pointToCheck)

          Coor.fromString(pointToCheck).ring(1)
          .forEach(pointInRing => {
            if (this.tree.find(pointInRing.asArray()) != null && !pointsToCheck.has(pointInRing.toString()) && !gatheredPoints.has(pointInRing.toString())) {
              nextPointsToCheck.add(pointInRing.toString())
            }
          })
        })
        pointsToCheck = new Set<string>([...nextPointsToCheck])
        nextPointsToCheck.clear()
      }

      landmasses.push(new Landmass([...gatheredPoints].map(i => Coor.fromString(i))))
    })

    return landmasses
  }

  
}

export interface HasPoints {
  points: KDTree<LandmassPoint>
}

export interface LandmassPoint {
  coor: Coor
  landmass: Landmass
  isCoastal: boolean
  partOfCoastalRing: CostalRing | null
}

export interface BodyOfWater extends HasPoints {}

export interface CostalRing extends HasPoints {
  isBeach: boolean
  water: BodyOfWater | null

  color: number
}

export class Landmass {
  points: KDTree<LandmassPoint>

  color: number = getRandomNumber(0, 256)

  constructor(points: Coor[]) {
    this.points = new KDTree(
      points.map(point => ({
        point: point.asArray(),
        value: {
          coor: point,
          landmass: this,
          isCoastal: false,
          partOfCoastalRing: null
        } as LandmassPoint
      }))
    )
  }

  private costalPoints: KDTree<LandmassPoint> | undefined

  clearCostalPoints() {
    this.costalPoints = undefined
  }

  getCostalPoints() : KDTree<LandmassPoint> {
    if (!this.costalPoints) {
      let newCostalPoints: KDTreeInput<LandmassPoint>[] = []
      this.points.all().forEach(point => {
        if (point.value.coor.getAdjacentCoors().filter(adjacentPoint => !this.points.find(adjacentPoint.asArray())).length > 0) {
          point.value.isCoastal = true
          newCostalPoints.push(point)
        }
      })
      this.costalPoints = new KDTree(newCostalPoints)
    }
    
    return this.costalPoints
  }

  soften() {
    let newPoints: LandmassPoint[] = []

    shuffle(this.getCostalPoints().all()).forEach(p => {
      p.value.coor.getAdjacentCoors()
      .forEach(ap => {
        if (!this.points.find(ap.asArray())) {
          if (ap.ring(1).filter(rp => this.points.find(rp.asArray())).length > 6) {
            newPoints.push({
              coor: ap,
              isCoastal: false,
              landmass: this,
              partOfCoastalRing: null
            })
          }
        }
      })
    })

    this.points = new KDTree([...this.points.all(), ...newPoints.map(i => ({
      point: i.coor.asArray(),
      value: i
    }))])

    this.clearCostalPoints()
    this.clearCoastalRings()
  }


  private costalRings: {
    beach: CostalRing,
    lakes: CostalRing[]
  } | null = null

  clearCoastalRings() {
    this.costalRings = null
  }

  getCoastalRings() {
    if (!this.costalRings) {
      let newCostalRings: CostalRing[] = []
      
      this.getCostalPoints().all().forEach(costalPoint => {
        if (newCostalRings.filter(ring => ring.points.find(costalPoint.point)).length > 0) return

        const newRingPoints: Set<LandmassPoint> = new Set()

        let current = new Set<LandmassPoint>()
        let next = new Set<LandmassPoint>()

        current.add(costalPoint.value)

        while (current.size > 0) {
          current.forEach(point => {
            newRingPoints.add(point)
            point.coor.ring(1)
            .map(p => this.getCostalPoints().find(p.asArray()))
            .forEach(potentialPoint => {
              if (potentialPoint && !newRingPoints.has(potentialPoint.value)) {
                next.add(potentialPoint.value)
              }
            })
          })

          current = new Set([...next])
          next.clear()
        }
        
        newCostalRings.push({
          points: new KDTree([...newRingPoints].map(i => ({
            point: i.coor.asArray(),
            value: i
          }))),
          water: null,
          isBeach: false,
          color: getRandomNumber(0, 256)
        })
      })

      let largestRing
      let largestRingSize = 0

      newCostalRings.forEach(i => {
        const newSize = i.points.all().length
        if (newSize > largestRingSize) {
          largestRingSize = newSize
          largestRing = i
        }
      })

      largestRing.isBeach = true

      this.costalRings = {
        beach: largestRing,
        lakes: newCostalRings.filter(i => i != largestRing)
      }
      
      ;[this.costalRings.beach, ...this.costalRings.lakes].forEach(ring => {
        ring.points.all().forEach(point => {
          point.value.partOfCoastalRing = ring
        })
      })
    }
    return this.costalRings
  }




}