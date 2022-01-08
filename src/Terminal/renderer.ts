import { TerminalInteractor } from "./interactor"
import { KDTree } from "../Utils/KDTree"
import { Coor } from "../Utils/Coordinate"
import { TerminalPixel } from "."

export class TerminalRenderer {
  stack: TerminalInteractor[] = []

  pixels: KDTree<TerminalPixel>

  width() {
    return process.stdout.columns || 0
  }
  height() {
    return process.stdout.rows || 0
  }

  constructor() {
    this.loadPixels()
  }

  pushInteractor(interactor: TerminalInteractor) {
    this.stack.push(interactor)
    this.loadPixels()
  }

  loadPixels() {
    const listOfListOfPixels = this.stack.map(i => i.pixels.all())
    let listOfPixels = []
    listOfListOfPixels.forEach(list => {
      list.forEach(item => {
        listOfPixels.push(item)
      })
    })
    this.pixels = new KDTree<TerminalPixel>(listOfPixels)
  }

  render() {
    const width = this.width()
    const height = this.height()

    this.cursor.move.to(new Coor(0, 0))

    let rendering = ''

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = this.pixels.find([x, y])

        if (pixel) {
          rendering += pixel.value.content
        } else {
          rendering += ' '
        }
      }
    }
    this.write(rendering)
  }


  setRawMode(to: boolean) {
    process.stdin.setRawMode(to)
  }

  withinBounds(point: Coor) {
    return this.withinWidth(point.x) && this.withinHeight(point.y)
  }

  withinWidth(x: number) {
    return 0 <= x && x < this.width()
  }

  withinHeight(y: number) {
    return 0 <= y && y < this.height()
  }

  clearScreen() {
    process.stdout.write("\033[2J")
    this.write("\033[H")
  }

  write(message: string) {
    process.stdout.write(message)
    return this
  }

  hideCaret = () => {
    process.stderr.write("\u001B[?25l")
    
    return this
  }

  showCaret = () => {
    process.stderr.write("\u001B[?25h")
    
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