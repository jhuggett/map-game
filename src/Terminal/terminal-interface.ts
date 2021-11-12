import { Coor } from "../Utils/Coordinate"
import { range } from "../Utils/Coordinate/misc"



interface TerminalSlice {
  start: Coor
  end: Coor
}

const createTerminalInteractor = (slice: TerminalSlice) => {
  return new TerminalInteractor(slice)
}

class TerminalInteractor {
  start: Coor
  end: Coor

  constructor(slice: TerminalSlice) {
    this.start = slice.start
    this.end = slice.end

    this.cursor.move.to(this.start)
  }

  clear() {
    range(this.start.x, this.end.x).forEach((x) => {
      range(this.start.y, this.end.y).forEach(y => {
        this.cursor.move.to(new Coor(x, y))
        this.write(" ")
      })
    })
  }

  clearScreen() {
    process.stdout.write("\033[2J")
    this.write("\033[H")
  }

  withinBounds(point: Coor) {
    return this.withinWidth(point.x) && this.withinHeight(point.y)
  }

  withinWidth(x: number) {
    return this.start.x <= x && x < this.end.x
  }

  withinHeight(y: number) {
    return this.start.y <= y && y < this.end.y
  }
  
  width() {
    return this.end.x - this.start.x
  }

  height() {
    return this.end.y - this.start.y
  }

  write(message: string) {
    process.stdout.write(message)
    return this
  }

  cursor = {
    move: {
      to: (point: Coor) => {
        if (this.withinBounds(point)) {
          this.write(`\u001b[${point.y};${point.x}H`)
        }
      },
      up: (amount: number = 1) => {
        this.write(`\u001b[${amount}A`)
      },
      left: (amount: number = 1) => {
          this.write(`\u001b[${amount}D`)
      },
      right: (amount: number = 1) => {
          this.write(`\u001b[${amount}C`)
      },
      down: (amount: number = 1) => {
          this.write(`\u001b[${amount}B`)
      },
      by: (x: number, y: number) => {
        if (x < 0) {
          this.cursor.move.left(x * -1)
        } else {
          this.cursor.move.right(x)
        }
        if (y < 0) {
          this.cursor.move.up(y * -1)
        } else {
          this.cursor.move.down(y)
        }
      }
    },
  }
}

interface TerminalInterface {
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
  start: new Coor(0, 0),
  end: new Coor(TerminalInterface.width(), TerminalInterface.height())
})