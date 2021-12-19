import { Coor } from "./coor"


export enum Direction {
    north = 'north',
    south = 'south', 
    east = 'east', 
    west = 'west'
}

export function getDirectionsOtherThan(direction: Direction) : Array<Direction> {
    return [
        Direction.north,
        Direction.south,
        Direction.east,
        Direction.west
    ].filter( val => val != direction )
}

export function getOppositeDirection(direction: Direction) : Direction {
    switch (direction) {
        case Direction.north: {
            return Direction.south
        }
        case Direction.south: {
            return Direction.north
        }
        case Direction.east: {
            return Direction.west
        }
        case Direction.west: {
            return Direction.east
        }
    }
}

export function filterCoors(grid: {
    xMin: number,
    xMax: number, 
    yMin: number, 
    yMax: number
}, coors: Array<Coor>) : Array<Coor> {
return coors.filter( coor => coor.x >= grid.xMin && 
    coor.x <= grid.xMax &&
    coor.y >= grid.yMin &&
    coor.y <= grid.yMax )
}

export function range(start: number, end: number) : Array<number> {
    let numbers: number[] = []
    for (let i = start; i <= end; i++) {
        numbers.push(i)
    }
    return numbers
}