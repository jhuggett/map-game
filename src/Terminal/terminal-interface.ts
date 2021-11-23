import { Coor } from "../Utils/Coordinate"
import { range } from "../Utils/Coordinate/misc"
import { KDTree } from "../Utils/KDTree"



interface TerminalSlice {
  start: Coor
  end: Coor
}

const createTerminalInteractor = (slice: TerminalSlice) => {
  return new TerminalInteractor(slice)
}


interface TerminalPixel {
  location: Coor
  content: string
}

export class TerminalInteractor {
  start: Coor
  end: Coor

  cursorLocation: Coor

  pixels: KDTree<TerminalPixel>

  constructor(slice: TerminalSlice) {
    this.start = slice.start
    this.end = slice.end

    let points: TerminalPixel[] = []

    range(this.start.y, this.end.y - 1).forEach(y => {
      range(this.start.x, this.end.x - 1).forEach(x => {
        points.push({
          location: new Coor(x, y),
          content: 'x'
        })
      })
    })

    let actualSize = (this.end.x - this.start.x) * (this.end.y - this.start.y)

    

    this.pixels = new KDTree(points.map(i => ({ point: i.location.asArray(), value: i })))

    this.cursorLocation = new Coor(this.start.x, this.start.y)

    this.resetCursor()



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

  center() {
    return new Coor(
      Math.floor(this.width() / 2),
      Math.floor(this.height() / 2)
    )
  }

  resetCursor() {
    this.cursorLocation = new Coor(this.start.x, this.start.y)
  }

  write(message: string) {
    
    const pixel = this.pixels.find(this.cursorLocation.asArray())
    if (pixel) {
      pixel.value.content = message
      if (this.cursorLocation.x + 1 < this.end.x) {
        this.cursor.move.right()
      } else if (this.cursorLocation.y + 1 < this.end.y) {
        this.cursor.move.down()
        this.cursorLocation.x = this.start.x
      }
    }

    //console.log({cursorLocation: this.cursorLocation, message, start: this.start, end: this.end});
    


    return this
    process.stdout.write(message)
    return this
  }

  cursor = {
    move: {
      to: (point: Coor) => {
        if (this.withinBounds(point)) {
          this.cursorLocation = new Coor(point.x, point.y)
        }
      },
      up: (amount: number = 1) => {
        this.cursorLocation.y -= amount
      },
      left: (amount: number = 1) => {
        this.cursorLocation.x -= amount
      },
      right: (amount: number = 1) => {
        this.cursorLocation.x += amount
      },
      down: (amount: number = 1) => {
        this.cursorLocation.y += amount
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

  coloring = {
    colors: {
      black: "\u001b[30m",
      red: "\u001b[31m",
      green: "\u001b[32m",
      yellow: "\u001b[33m",
      blue: "\u001b[34m",
      bgBlue: "\u001b[44m",
      bgGreen: "\u001b[42m",
      reset: "\u001b[0m"
    },
    red: (content: string) => {
        return this.coloring.colors.red + content + this.coloring.colors.reset
    },
    green: (content: string) => {
        return this.coloring.colors.green + content + this.coloring.colors.reset
    },
    yellow: (content: string) => {
        return this.coloring.colors.yellow + content + this.coloring.colors.reset
    },
    blue: (content: string) => {
        return this.coloring.colors.blue + content + this.coloring.colors.reset
    },

    bgBlue: (content: string) => {
        return this.coloring.colors.bgBlue + content + this.coloring.colors.reset
    },

    bgGreen: (content: string) => {
        return this.coloring.colors.bgGreen + content + this.coloring.colors.reset
    },
    fg256: (content, id: number) => {
      return `\u001b[38;5;${id}m` + content + this.coloring.colors.reset
    },
    bg256: (content, id: number) => {
      return `\u001b[48;5;${id}m` + content + this.coloring.colors.reset
    }
  }

  

  reactToKeyPress = async (callback?: (code: Buffer) => boolean) : Promise<Buffer> => {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    

    return new Promise( (resolve) => {
        return process.stdin.once('data', (data) => {
            process.stdin.setRawMode(false)
            process.stdin.pause()
            if (callback && callback(data)) {
                this.reactToKeyPress(callback)
            }
            resolve(data)
            })
        })
  }
}


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