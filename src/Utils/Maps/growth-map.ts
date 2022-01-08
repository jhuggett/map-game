import { Coor } from "../Coordinate"
import { shuffle, getRandomBool, getRandomNumber, getRandomItem } from "../Randomization"
import { KDTree, KDTreeInput } from "../KDTree"

export enum LandType {
  land, scaffold, coast, mountain, snowcapped
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
  elevation: number
  distanceToWater: number
  distanceToMountain: number
  landType: LandType

  river: River | null
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

  highestDistanceToWater = -1

  constructor(points: Coor[]) {
    this.points = new KDTree(
      points.map(point => ({
        point: point.asArray(),
        value: {
          coor: point,
          landmass: this,
          isCoastal: false,
          partOfCoastalRing: null,
          elevation: 1.0,
          distanceToWater: -1,
          distanceToMountain: -1,
          landType: LandType.land,
          river: null
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
              partOfCoastalRing: null,
              elevation: 1.0,
              distanceToWater: -1,
              distanceToMountain: -1,
              landType: LandType.land,
              river: null
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


  distanceToWater() {
    let currentDistance = 1

    this.costalPoints.all().map(i => i.value.distanceToWater = 0)

    let currentSet: Set<string> = new Set(this.costalPoints.all().map(i => i.value.coor.toString()))
    let nextSet: Set<string> = new Set()

    while (currentSet.size > 0) {
      currentSet.forEach(item => {
        const coor = Coor.fromString(item)
        coor.getAdjacentCoors().forEach(adjCoor => {
          const point = this.points.find(adjCoor.asArray())
          if (point && point.value.distanceToWater < 0) {
            point.value.distanceToWater = currentDistance
            nextSet.add(point.value.coor.toString())
          }
        })
      })

      currentSet = new Set([...nextSet])
      nextSet.clear()
      currentDistance += 1
    }

    this.highestDistanceToWater = currentDistance - 1
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
          point.value.landType = LandType.coast
          point.value.partOfCoastalRing = ring
        })
      })
    }
    return this.costalRings
  }

  mountainRanges: MoutainRange[] = []

    growMountains() {

      const distanceThreshold = 3

      const p = this.points.all().filter(i => i.value.distanceToWater > distanceThreshold)
      
      if (p.length == 0) return

      let fertilePoints = new KDTree(p)
      
      let fertileRegions: { points: KDTree<LandmassPoint> }[] = seperatePoints(fertilePoints).map(i => ({ points: i }))

      let mountainRanges = []


      fertileRegions.forEach(region => {
        let lowestLevel = 1000
        let highestLevel = 0

        


        region.points.all().forEach(point => {
          if (point.value.distanceToWater > highestLevel) highestLevel = point.value.distanceToWater
          if (point.value.distanceToWater < lowestLevel) lowestLevel = point.value.distanceToWater
        })

        if (highestLevel - lowestLevel < 2) return

        let snowCapped: KDTreeInput<LandmassPoint>[] = []
        let regualar: KDTreeInput<LandmassPoint>[] = []

        region.points.all().forEach(point => {
          if (point.value.distanceToWater == highestLevel) {
            point.value.landType = LandType.snowcapped
            snowCapped.push(point)
          } else if (point.value.distanceToWater == highestLevel - 1) {
            point.value.landType = LandType.mountain
            regualar.push(point)
          }
        })

        this.mountainRanges.push({
          snowcapped: new KDTree<LandmassPoint>(snowCapped),
          regualar: new KDTree<LandmassPoint>(regualar)
        })

      })

    }

    rivers: River[] = []

    findDistanceToMountains() {
      let currentDistance = 1

      this.mountainRanges.forEach(mountain => {
        const aggregatePoints = new Set<string>()

        currentDistance = 1

        let curr: LandmassPoint[] = nextPointsSpread(mountain.regualar.all().map(i => i.value).map(i => i.coor), aggregatePoints).map(i => this.points.find(i.asArray())?.value).filter(i => !!i)

        while (curr.length > 0) {
          curr.forEach(p => {
            if (currentDistance < p.distanceToMountain || p.distanceToMountain === -1) {
              p.distanceToMountain = currentDistance
            }
          })
          curr = nextPointsSpread(curr.map(i => i.coor), aggregatePoints).map(i => this.points.find(i.asArray())?.value).filter(i => !!i)
          currentDistance++
        }
      })
    }

    calculateElevation() {
      this.points.all().forEach(p => {
        p.value.elevation = p.value.distanceToWater
      })
    }
    
    generateRivers() {

      const allRiverPoints = new Set<string>()

      this.mountainRanges.forEach(r => {

        const dupPoints = new Set<string>()

        let pointsAroundMountain = r.regualar.all().flatMap(i => {
          return i.value.coor.getAdjacentCoors().map(t => {
            const pToCheck = this.points.find(t.asArray())
            if (pToCheck && pToCheck.value.landType == LandType.land && !dupPoints.has(pToCheck.value.coor.toString())) {
              dupPoints.add(pToCheck.value.coor.toString())
              return pToCheck.value
            }
          })
        }).filter(i => !!i).map(i => ({
          point: i.coor.asArray(),
          value: i
        }))

        
        

        let riverStarts: KDTreeInput<LandmassPoint>[] = []

        const numOfRivers = getRandomNumber(3, 6)

        // need to make sure that rives can't use the same point
        // and river than hit another river needs to stop
        // and somehow render intercected rivers

        const shuffledPoints = shuffle(pointsAroundMountain)

        shuffledPoints.slice(-numOfRivers).forEach(i => riverStarts.push(i))

        riverStarts.forEach(start => {

          const newRiverPoints: KDTreeInput<LandmassPoint>[] = []


          const first = start.value

          let last = start.value


          const newRiver = {
            start: this.points.find(first.coor.asArray()).value,
            end: this.points.find(last.coor.asArray()).value,
            points: new KDTree(newRiverPoints),
            linkedPoints: [] as Linked<LandmassPoint>[]
        }

          let allPoints: LandmassPoint[] = []

          let current = start.value

          let hitWater = false

          let hitRiver = false

          while (!hitWater && !hitRiver) {
            if (allRiverPoints.has(current.coor.toString())) {
              hitRiver = true
              break;
            }
            if (current.elevation === 0) hitWater = true
            

            const point = this.points.find(current.coor.asArray())

            point.value.river = newRiver

            allRiverPoints.add(point.value.coor.toString())

            allPoints.push(point.value)

            const prevPoint = newRiver.linkedPoints[newRiver.linkedPoints.length - 1]
            if (prevPoint) {
              const newLink = {
                previous: prevPoint,
                value: point.value,
                next: null
              }
              prevPoint.next = newLink
              newRiver.linkedPoints.push(newLink)
            } else {
              newRiver.linkedPoints.push({
                previous: getRandomItem(point.value.coor.getAdjacentCoors().map(i => this.points.find(i.asArray())).filter(i => i && i.value.landType == LandType.mountain)),
                value: point.value,
                next: null
              })
            }

            let lowestElevation = 99999999999

            let possibleNext: LandmassPoint[] = []

            point.value.coor.getAdjacentCoors().forEach(i => {
              const p = this.points.find(i.asArray())

              p && possibleNext.push(p.value)

              if (p && p.value.elevation < lowestElevation) lowestElevation = p.value.elevation
            })

            possibleNext = shuffle(possibleNext.filter(i => i.elevation === lowestElevation))

            const next = getRandomItem(possibleNext)

            current = next
            
          }

          

          const previousLast = newRiver.linkedPoints[newRiver.linkedPoints.length - 1]

          if (!previousLast) return

          if (hitWater) {
            const endPoint = getRandomItem(newRiver.linkedPoints[newRiver.linkedPoints.length - 1].value.coor.getAdjacentCoors().filter(i => !this.points.find(i.asArray())))

            const fakePoint: LandmassPoint = {
              coor: endPoint,
              distanceToMountain: 0,
              distanceToWater: 0,
              elevation: 0,
              isCoastal: false,
              landType: LandType.scaffold,
              landmass: null,
              partOfCoastalRing: null,
              river: null
            }

            const newLast = {
              previous: previousLast,
              value: fakePoint,
              next: null
            }

            previousLast.next = newLast
          } else {
            const newLast = {
              previous: previousLast,
              value: current,
              next: null
            }

            previousLast.next = newLast
          }
          
          

          //newRiver.linkedPoints.push(newLast)

          

          newRiver.points = new KDTree(newRiverPoints)
          newRiver.end = this.points.find(last.coor.asArray()).value

          this.rivers.push(newRiver)



        })


      })


    }
  }



  interface River {
    start: LandmassPoint
    end: LandmassPoint
    points: KDTree<LandmassPoint>
    linkedPoints: Linked<LandmassPoint>[]
  }

  interface MoutainRange {
    snowcapped: KDTree<LandmassPoint>
    regualar: KDTree<LandmassPoint>
  }


interface Linked<T> {
  previous?: Linked<T>
  value: T
  next?: Linked<T>
}





const nextPointsSpread = (currentRing: Coor[], pointsToExclude: Set<string>) => {
  let nextRing: Coor[] = []

  currentRing.forEach(point => {
    point.getAdjacentCoors().forEach(adjacentCoor => {
      if (!pointsToExclude.has(adjacentCoor.toString())) {
        nextRing.push(adjacentCoor)
        pointsToExclude.add(adjacentCoor.toString())
      }
    })
  })

  return nextRing
}

const seperatePoints = (points: KDTree<LandmassPoint>) : KDTree<LandmassPoint>[] => {
  let fertileRegions: KDTree<LandmassPoint>[] = []

  const allGatheredPoints = new Set<string>()

  points.all().forEach(point => {
    if (allGatheredPoints.has(point.value.coor.toString())) return

    const gatheredPoints = new Set<string>()

    let currPoints = new Set<string>()
    let nextPoints = new Set<string>()

    currPoints.add(point.value.coor.toString())

    while (currPoints.size > 0) {

      currPoints.forEach(i => {
        const pointToCheck = Coor.fromString(i)

        gatheredPoints.add(i)
        allGatheredPoints.add(i)

        pointToCheck.getAdjacentCoors()
        .filter(t => !!points.find(t.asArray()) && !gatheredPoints.has(t.toString()))
        .forEach(t => nextPoints.add(t.toString()))
      })

      currPoints = new Set<string>([...nextPoints])
      nextPoints.clear()
    }

    fertileRegions.push(
      new KDTree([...gatheredPoints].map(t => points.find(Coor.fromString(t).asArray())))
    )
  })

  return fertileRegions
}