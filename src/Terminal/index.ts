import { Coor } from "../Utils/Coordinate"
import { range } from "../Utils/Coordinate/misc"
import { KDTree } from "../Utils/KDTree"
import { TerminalInteractor } from "./interactor"



export interface TerminalSlice {
  start: () => Coor
  end: () => Coor
}

const createTerminalInteractor = (slice: TerminalSlice) => {
  return new TerminalInteractor(slice)
}

export interface TerminalPixel {
  location: Coor
  content: string
}



export interface TerminalInterface {
  width(): number
  height(): number
  interactor: TerminalInteractor
}

export const TerminalInterface: TerminalInterface = {
  width() {
    return process.stdout.columns || 0
  },
  height() {
    return process.stdout.rows || 0
  },
  interactor: undefined
}

TerminalInterface.interactor = createTerminalInteractor({
  start: () => new Coor(0, 0),
  end: () => new Coor(TerminalInterface.width(), TerminalInterface.height())
})